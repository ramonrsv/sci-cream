//! The composition hierarchy: how [`CompKey`] roll-ups decompose into their parts.
//!
//! A key can have more than one parent — [`CompKey::MilkFat`] is a part of both
//! [`CompKey::TotalFats`] (macronutrient) and [`CompKey::MilkSolids`] (source) — so the relation is
//! a DAG, encoded as a forest of [`HierarchyNode`]s; shared key appears under each of its parents.
//!
//! There are two forests, because the additive math and the UI want different shapes:
//!
//! - The structural forest (over [`CompKey`], via [`structural_hierarchy`]) holds only **additive**
//!   part/whole identities — a roll-up's parts never exceed it in any [`Composition`] — so it is
//!   the trustworthy basis for the sum invariants and balancing dominance check.
//!   [`CompKey::children`] / [`CompKey::parents`] / [`CompKey::is_rollup`] read its edges.
//! - The display forest (over [`PropKey`], via [`display_hierarchy`]) is what the UI groups by. It
//!   reuses the structural subtrees and adds visual-only groupings (ratios, an FPD group, `Energy`,
//!   `TotalSNFS` beside `TotalSNF`), so it is **not** a supertree of the structural forest.
//!
//! Each forest is built once behind a [`LazyLock`], sharing subtree builders so a part list (the
//! seven sugars, the eleven stabilizers, …) is written exactly once.

use std::collections::HashMap;
use std::hash::Hash;
use std::sync::LazyLock;

use serde::Serialize;

use crate::{composition::CompKey, properties::PropKey};

#[cfg(doc)]
use crate::composition::Composition;

/// A node in the composition hierarchy: a key and its children, each a node of the same kind.
///
/// `Serialize` flattens to `{ key, children }`, which is how the WASM layer hands the forest to JS.
#[derive(Debug, Clone, Serialize)]
pub struct HierarchyNode<K> {
    /// The key at this node.
    pub key: K,
    /// The node's direct children, in display order. Empty for a leaf.
    pub children: Vec<Self>,
}

impl<K> HierarchyNode<K> {
    /// A roll-up branch node with the given direct children.
    #[must_use]
    pub const fn br(key: K, children: Vec<Self>) -> Self {
        Self { key, children }
    }

    /// A leaf node (no children).
    #[must_use]
    pub const fn lf(key: K) -> Self {
        Self {
            key,
            children: Vec::new(),
        }
    }
}

/// Lifts a structural ([`CompKey`]) node into the display forest's [`PropKey`] space, wrapping each
/// key as [`PropKey::Comp`] and recursing into its children.
impl From<HierarchyNode<CompKey>> for HierarchyNode<PropKey> {
    fn from(node: HierarchyNode<CompKey>) -> Self {
        Self {
            key: PropKey::Comp(node.key),
            children: node.children.into_iter().map(Into::into).collect(),
        }
    }
}

/// A row of leaf nodes from a key list (the common case for a roll-up's direct parts).
fn leaves<K: Copy>(keys: &[K]) -> Vec<HierarchyNode<K>> {
    keys.iter().copied().map(HierarchyNode::lf).collect()
}

/// Lifts any rollup into a new rollup with the `extras` prepended to its children.
fn prefix_extras<KA, KB, KD>(extras: Vec<HierarchyNode<KB>>, rollup: HierarchyNode<KA>) -> HierarchyNode<KD>
where
    KA: Copy,
    KB: Copy,
    KD: Copy,
    HierarchyNode<KA>: Into<HierarchyNode<KD>>,
    HierarchyNode<KB>: Into<HierarchyNode<KD>>,
{
    let mut node: HierarchyNode<KD> = rollup.into();
    node.children = [extras.into_iter().map(Into::into).collect(), node.children].concat();
    node
}

/// Lifts any rollup into a new rollup with the `extras` appended to its children.
fn suffix_extras<KA, KB, KD>(rollup: HierarchyNode<KA>, extras: Vec<HierarchyNode<KB>>) -> HierarchyNode<KD>
where
    KA: Copy,
    KB: Copy,
    KD: Copy,
    HierarchyNode<KA>: Into<HierarchyNode<KD>>,
    HierarchyNode<KB>: Into<HierarchyNode<KD>>,
{
    let mut node: HierarchyNode<KD> = rollup.into();
    node.children = [node.children, extras.into_iter().map(Into::into).collect()].concat();
    node
}

// -------------------------------------------------------------------------------------------------
// Shared subtrees
//
// Each returns a `CompKey` node, written once and reused by both forests. The display forest lifts
// subtrees via `.into()` (`CompKey` → `PropKey`) and augments some with visual-only children.
// -------------------------------------------------------------------------------------------------

pub(crate) mod subtrees {
    // Glob imports used inside `subtrees` module to simplify the builder code
    #[allow(clippy::enum_glob_use)]
    use crate::composition::CompKey::{self, *};

    use super::{HierarchyNode as N, leaves};

    // === Ingredient sources ===================

    // --- Milk ---------------------------------
    pub(crate) fn milk_solids() -> N<CompKey> {
        N::br(
            MilkSolids,
            vec![
                N::lf(MilkFat),
                N::br(MSNF, vec![N::lf(MilkSugars), N::br(MilkSNFS, leaves(&[MilkProteins]))]),
            ],
        )
    }

    // --- Cacao --------------------------------
    pub(crate) fn cacao_solids() -> N<CompKey> {
        N::br(CacaoSolids, leaves(&[CocoaButter, CocoaSolids]))
    }

    // --- Nuts ---------------------------------
    pub(crate) fn nut_solids() -> N<CompKey> {
        N::br(NutSolids, leaves(&[NutFat, NutSNF]))
    }

    // --- Eggs ---------------------------------
    pub(crate) fn egg_solids() -> N<CompKey> {
        N::br(EggSolids, vec![N::lf(EggFat), N::br(EggSNF, vec![N::lf(EggProteins)])])
    }

    // === Macronutrients =======================

    // --- Totals -------------------------------
    pub(crate) fn total_solids() -> N<CompKey> {
        N::br(TotalSolids, vec![total_fats(), total_snf()])
    }

    pub(crate) fn total_fats() -> N<CompKey> {
        N::br(TotalFats, leaves(&[MilkFat, CocoaButter, NutFat, EggFat, OtherFats]))
    }

    pub(crate) fn total_snf() -> N<CompKey> {
        N::br(TotalSNF, vec![total_carbohydrates(), total_proteins(), total_artificial()])
    }

    pub(crate) fn total_snfs() -> N<CompKey> {
        N::br(TotalSNFS, leaves(&[MilkSNFS, CocoaSolids, NutSNF, EggSNF, OtherSNFS]))
    }

    pub(crate) fn total_proteins() -> N<CompKey> {
        N::br(TotalProteins, leaves(&[MilkProteins, EggProteins]))
    }

    // --- Carbohydrates ------------------------
    pub(crate) fn total_carbohydrates() -> N<CompKey> {
        N::br(TotalCarbohydrates, vec![total_sugars(), total_polyols(), total_fiber()])
    }

    pub(crate) fn total_fiber() -> N<CompKey> {
        N::br(TotalFiber, leaves(&[Inulin, Oligofructose]))
    }

    pub(crate) fn total_sugars() -> N<CompKey> {
        N::br(TotalSugars, leaves(&[Glucose, Fructose, Galactose, Sucrose, Lactose, Maltose, Trehalose]))
    }

    pub(crate) fn total_polyols() -> N<CompKey> {
        N::br(TotalPolyols, leaves(&[Erythritol, Maltitol, Sorbitol, Xylitol]))
    }

    // --- Artificial sweeteners ----------------
    pub(crate) fn total_artificial() -> N<CompKey> {
        N::br(TotalArtificial, leaves(&[Aspartame, Cyclamate, Saccharin, Sucralose, Steviosides, Mogrosides]))
    }

    // --- Sweeteners ---------------------------
    pub(crate) fn total_sweeteners() -> N<CompKey> {
        N::br(TotalSweeteners, leaves(&[TotalSugars, TotalPolyols, TotalArtificial]))
    }

    // === Other functional groups ==============

    // --- PACs ---------------------------------
    pub(crate) fn total_pac() -> N<CompKey> {
        N::br(TotalPAC, leaves(&[PACsgr, PACslt, PACmlk, PACalc]))
    }

    // --- Stabilizers --------------------------
    pub(crate) fn total_stabilizers() -> N<CompKey> {
        N::br(
            TotalStabilizers,
            leaves(&[
                Cornstarch,
                TapiocaStarch,
                Pectin,
                Gelatin,
                LocustBeanGum,
                GuarGum,
                Carrageenans,
                CarboxymethylCellulose,
                XanthanGum,
                SodiumAlginate,
                TaraGum,
            ]),
        )
    }

    // --- Emulsifiers --------------------------
    pub(crate) fn total_emulsifiers() -> N<CompKey> {
        N::br(TotalEmulsifiers, leaves(&[Lecithin]))
    }
}

// -------------------------------------------------------------------------------------------------
// Forests
//
// ...
// -------------------------------------------------------------------------------------------------

mod forests {
    // Glob imports used inside `forests` module to simplify the builder code
    #[allow(clippy::enum_glob_use, clippy::wildcard_imports)]
    use crate::{
        composition::{
            CompKey::{self, *},
            RatioKey::*,
            hierarchy::subtrees::*,
        },
        fpd::FpdKey::*,
        properties::PropKey::{self, *},
    };

    use super::{HierarchyNode as N, prefix_extras, suffix_extras};

    /// The structural composition hierarchy: a forest of strictly **additive** part/whole
    /// identities over [`CompKey`], used by correctness checks. See the [module docs](self).
    pub(crate) fn structural_forest() -> Vec<N<CompKey>> {
        vec![
            // Ingredient-source axis
            milk_solids(),
            cacao_solids(),
            nut_solids(),
            egg_solids(),
            // Macronutrient axis
            total_solids(), // total_snf() is already a child of total_solids()
            total_snfs(),
            total_sweeteners(),
            total_pac(),
            total_stabilizers(),
            total_emulsifiers(),
        ]
    }

    /// The display composition hierarchy over [`PropKey`]. See the [module docs](self).
    ///
    /// These groupings are purely visual; the math is still based on the structural forest.
    pub(crate) fn display_forest() -> Vec<N<PropKey>> {
        vec![
            N::lf(Comp(Energy)),
            // Ingredient-source axis
            milk_solids().into(),
            cacao_solids().into(),
            nut_solids().into(),
            egg_solids().into(),
            // Macronutrient axis, with visual-only groupings for ratios and FPDs
            prefix_extras(vec![N::lf(Comp(POD))], total_sweeteners()),
            total_solids().into(),
            total_snfs().into(),
            N::lf(Comp(Salt)),
            prefix_extras(vec![N::lf(Ratio(StabilizersPerWater))], total_stabilizers()),
            prefix_extras(vec![N::lf(Ratio(EmulsifiersPerFat))], total_emulsifiers()),
            N::br(Comp(Alcohol), vec![N::lf(Comp(ABV))]),
            suffix_extras(
                prefix_extras(vec![N::lf(Ratio(AbsPAC)), N::lf(Ratio(AbsNetPAC)), N::lf(Comp(NetPAC))], total_pac()),
                vec![N::lf(Comp(HF))],
            ),
            // Other functional groups
            N::br(Fpd(FPD), vec![N::lf(Fpd(ServingTemp)), N::lf(Fpd(HardnessAt14C))]),
            N::lf(Comp(Water)),
            N::lf(Comp(SaturatedFat)),
            N::lf(Comp(TransFat)),
        ]
    }
}

/// The structural forest, built once. Source of truth for the additive invariants.
static STRUCTURAL: LazyLock<Vec<HierarchyNode<CompKey>>> = LazyLock::new(forests::structural_forest);

/// The display forest, built once. Serialized to JS by [`display_hierarchy`].
static DISPLAY: LazyLock<Vec<HierarchyNode<PropKey>>> = LazyLock::new(forests::display_forest);

/// Lazily-derived lookups over a forest (see [`Index::build`]).
struct Index<K: 'static> {
    /// Each roll-up's direct parts, gathered from every occurrence.
    children: HashMap<K, Vec<K>>,
    /// Each key's parents (roll-ups listing it), in forest order.
    parents: HashMap<K, Vec<K>>,
    /// A pre-order of the forest: every node, paired with its depth (a shared key recurs).
    ordered: Vec<(K, u32)>,
    /// The forest's top-level keys, in order.
    roots: Vec<K>,
}

impl<K: 'static + Eq + Hash + Copy> Index<K> {
    /// Walks `forest` once to populate every lookup.
    fn build(forest: &[HierarchyNode<K>]) -> Self {
        let mut index = Self {
            children: HashMap::new(),
            parents: HashMap::new(),
            ordered: Vec::new(),
            roots: Vec::new(),
        };
        index.collect_edges(forest);
        index.collect_preorder(forest, 0);
        index
    }

    /// Records both directions of every part/whole edge: a roll-up's parts and each part's parents
    /// (the latter in forest order).
    fn collect_edges(&mut self, nodes: &[HierarchyNode<K>]) {
        for node in nodes {
            if !node.children.is_empty() {
                let parts = node.children.iter().map(|child| child.key).collect();
                let _unused = self.children.insert(node.key, parts);
                for child in &node.children {
                    self.parents.entry(child.key).or_default().push(node.key);
                }
                self.collect_edges(&node.children);
            }
        }
    }

    /// Records a pre-order of `nodes`: every node paired with its depth (shared keys recur). The
    /// top-level keys (depth 0) are also collected as the forest's roots.
    fn collect_preorder(&mut self, nodes: &[HierarchyNode<K>], depth: u32) {
        for node in nodes {
            self.ordered.push((node.key, depth));
            if depth == 0 {
                self.roots.push(node.key);
            }
            self.collect_preorder(&node.children, depth + 1);
        }
    }
}

/// Edge lookups over the additive [`STRUCTURAL`] forest, backing [`CompKey`]'s hierarchy methods.
static STRUCTURAL_INDEX: LazyLock<Index<CompKey>> = LazyLock::new(|| Index::build(&STRUCTURAL));

/// Pre-order + roots over the [`DISPLAY`] forest, backing the `display_hierarchy_*` accessors.
static DISPLAY_INDEX: LazyLock<Index<PropKey>> = LazyLock::new(|| Index::build(&DISPLAY));

impl CompKey {
    /// The direct parts of this key in the structural composition hierarchy, in canonical order.
    ///
    /// Empty for a non-roll-up. The parts sum to no more than this key in any [`Composition`]
    /// (exactly, for residual-free roll-ups).
    #[must_use]
    pub fn children(self) -> &'static [Self] {
        match STRUCTURAL_INDEX.children.get(&self) {
            Some(children) => children,
            None => &[],
        }
    }

    /// Every roll-up that has this key as a direct part, in forest order — the inverse of
    /// [`children`](Self::children).
    ///
    /// A key shared by several roll-ups (e.g. [`CompKey::MilkFat`]) lists them all; first is its
    /// first occurrence in the forest. Empty for a top-level key or one absent from the hierarchy.
    #[must_use]
    pub fn parents(self) -> &'static [Self] {
        match STRUCTURAL_INDEX.parents.get(&self) {
            Some(parents) => parents,
            None => &[],
        }
    }

    /// Whether this key is a roll-up (has parts) in the structural composition hierarchy.
    #[must_use]
    pub fn is_rollup(self) -> bool {
        STRUCTURAL_INDEX.children.contains_key(&self)
    }

    /// Whether this key is a transitive part of `whole` — i.e. `whole` is an ancestor roll-up
    /// reachable by following [`parents`](Self::parents). A key is **not** a part of itself.
    ///
    /// Because a part never exceeds its roll-up in any [`Composition`] (see
    /// [`children`](Self::children)), `self.is_part_of(whole)` implies `self <= whole` always.
    #[must_use]
    pub fn is_part_of(self, whole: Self) -> bool {
        self.parents()
            .iter()
            .any(|&parent| parent == whole || parent.is_part_of(whole))
    }

    /// Whether this key is a residual-free (exact) roll-up: its value equals the sum of its
    /// [`children`](Self::children) exactly in every [`Composition`], with no residual.
    ///
    /// The remaining roll-ups (e.g. [`CompKey::TotalSNF`], [`CompKey::MilkSNFS`]) keep a residual
    /// beyond their listed parts, so for them the parts only sum to *no more than* the whole.
    #[must_use]
    pub const fn is_residual_free_rollup(self) -> bool {
        matches!(
            self,
            Self::TotalSolids
                | Self::TotalFats
                | Self::TotalSugars
                | Self::TotalPolyols
                | Self::TotalArtificial
                | Self::TotalSweeteners
                | Self::TotalSNFS
                | Self::TotalPAC
                | Self::TotalStabilizers
                | Self::TotalEmulsifiers
                | Self::MilkSolids
                | Self::MSNF
                | Self::CacaoSolids
                | Self::NutSolids
                | Self::EggSolids
        )
    }
}

/// The structural composition hierarchy forest. See the [module docs](self) for how it is read.
#[must_use]
pub fn structural_hierarchy() -> &'static [HierarchyNode<CompKey>] {
    &STRUCTURAL
}

/// The display composition hierarchy forest. See the [module docs](self) for how it is read.
#[must_use]
pub fn display_hierarchy() -> &'static [HierarchyNode<PropKey>] {
    &DISPLAY
}

/// A pre-order traversal of the display forest, pairing each node with its depth.
///
/// Every node is listed, so a key shared by several roll-ups recurs — once under each parent, at
/// that parent's depth. Callers that render each key once de-duplicate as they see fit.
#[must_use]
pub fn display_hierarchy_ordered() -> &'static [(PropKey, u32)] {
    &DISPLAY_INDEX.ordered
}

/// The display forest's top-level keys (those with no parents), in [`display_hierarchy`] order.
#[must_use]
pub fn display_hierarchy_roots() -> &'static [PropKey] {
    &DISPLAY_INDEX.roots
}

#[cfg(all(test, feature = "database"))]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
mod tests {
    use std::collections::{HashMap, HashSet};
    use std::sync::LazyLock;

    use strum::IntoEnumIterator;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::tests::assets::EMBEDDED_DB;

    use super::*;
    use crate::{
        composition::{CompKey::*, Composition, RatioKey},
        constants::COMPOSITION_EPSILON,
        data::get_all_recipe_entries,
        fpd::FpdKey,
        ingredient::Category,
        properties::PropKey::{self, *},
        recipe::Recipe,
        validate::{are_equal, is_subset},
    };

    // Compositions of all embedded ingredients
    static ING_COMPS: LazyLock<Vec<Composition>> = LazyLock::new(|| {
        EMBEDDED_DB
            .get_all_ingredients()
            .into_iter()
            .map(|ing| ing.composition)
            .collect()
    });

    // Compositions of all embedded dairy ingredients
    static DAIRY_COMPS: LazyLock<Vec<Composition>> = LazyLock::new(|| {
        EMBEDDED_DB
            .get_ingredients_by_category(Category::Dairy)
            .into_iter()
            .map(|ing| ing.composition)
            .collect()
    });

    // Compositions of all embedded recipes
    static RECIPE_COMPS: LazyLock<Vec<Composition>> = LazyLock::new(|| {
        get_all_recipe_entries()
            .into_iter()
            .map(|entry| {
                Recipe::from_light_recipe(None, &entry.recipe, &EMBEDDED_DB)
                    .unwrap()
                    .calculate_composition()
                    .unwrap()
            })
            .collect()
    });

    // Every available composition from ingredients and recipes
    static ALL_COMPS: LazyLock<Vec<Composition>> =
        LazyLock::new(|| ING_COMPS.iter().chain(RECIPE_COMPS.iter()).copied().collect());

    #[test]
    fn children_never_exceed_their_rollup() {
        for comp in &*ALL_COMPS {
            for key in CompKey::iter().filter(|key| key.is_rollup()) {
                let children_sum: f64 = key.children().iter().map(|&part| comp.get(part)).sum();
                assert!(
                    is_subset(children_sum, comp.get(key)),
                    "{key:?} parts sum {children_sum} exceeds roll-up {}",
                    comp.get(key),
                );
            }
        }
    }

    #[test]
    fn exact_rollups_equal_their_children() {
        for comp in &*ALL_COMPS {
            for rollup in CompKey::iter().filter(|key| key.is_residual_free_rollup()) {
                let parts_sum: f64 = rollup.children().iter().map(|&part| comp.get(part)).sum();
                assert!(
                    are_equal(comp.get(rollup), parts_sum),
                    "{rollup:?}: get {} != parts sum {parts_sum}",
                    comp.get(rollup),
                );
            }
        }
    }

    #[test]
    fn residual_free_rollups_are_rollups() {
        // A residual-free roll-up must actually be a roll-up; guards against a typo in the list.
        for key in CompKey::iter().filter(|key| key.is_residual_free_rollup()) {
            assert!(key.is_rollup(), "{key:?} is marked residual-free but is not a roll-up");
        }
    }

    #[test]
    fn is_part_of_is_transitive_and_strict() {
        // Direct parts.
        assert!(MilkFat.is_part_of(MilkSolids));
        assert!(MilkProteins.is_part_of(MilkSNFS));
        // Transitive: MilkFat -> TotalFats -> TotalSolids.
        assert!(MilkFat.is_part_of(TotalSolids));
        // Siblings are not in a part/whole relationship.
        assert!(!CocoaButter.is_part_of(CocoaSolids));
        // A key is not a part of itself, and an ancestor is not a part of its descendant.
        assert!(!MilkFat.is_part_of(MilkFat));
        assert!(!TotalSolids.is_part_of(MilkFat));
    }

    #[test]
    fn shared_key_lists_all_its_parents() {
        // MilkFat is a part of both MilkSolids (source) and TotalFats (macronutrient).
        assert!(TotalFats.children().contains(&MilkFat));
        assert!(MilkSolids.children().contains(&MilkFat));
        assert_eq!(MilkFat.parents(), &[MilkSolids, TotalFats]);

        // MilkProteins is a part of both MilkSNFS (source) and TotalProteins (macronutrient).
        assert_eq!(MilkProteins.parents(), &[MilkSNFS, TotalProteins]);
    }

    /// Milk's non-fat solids split exactly (`MSNF = MilkSugars + MilkSNFS`, checked across every
    /// dairy ingredient), then [`CompKey::MilkSNFS`] keeps a mineral residual beyond
    /// [`CompKey::MilkProteins`]. The strict-subset relations need non-zero lactose (whey isolates
    /// and label-rounded creams have none), so they are shown on lactose > 0 ingredients.
    #[test]
    fn milk_subcomponents_nest_under_milk_solids() {
        assert_eq!(MilkSolids.children(), &[MilkFat, MSNF]);
        assert_eq!(MSNF.children(), &[MilkSugars, MilkSNFS]);
        assert_eq!(MilkSNFS.children(), &[MilkProteins]);

        // MSNF splits exactly into its two siblings for every dairy ingredient.
        for milk in &*DAIRY_COMPS {
            assert_abs_diff_eq!(
                milk.get(MSNF),
                milk.get(MilkSugars) + milk.get(MilkSNFS),
                epsilon = COMPOSITION_EPSILON
            );
        }

        // On an ordinary milk, the sugars are a proper subset of MSNF
        for milk in DAIRY_COMPS.iter().filter(|comp| comp.get(Lactose) > 0.0) {
            assert_lt!(milk.get(MilkSugars), milk.get(MSNF));
            assert_lt!(milk.get(MilkSNFS), milk.get(MSNF));
            assert_lt!(milk.get(MilkProteins), milk.get(MilkSNFS));
        }
    }

    #[test]
    fn each_key_is_a_branch_at_most_once() {
        fn count_branches(nodes: &[HierarchyNode<CompKey>], counts: &mut HashMap<CompKey, u32>) {
            for node in nodes {
                if !node.children.is_empty() {
                    *counts.entry(node.key).or_default() += 1;
                    count_branches(&node.children, counts);
                }
            }
        }
        let mut counts: HashMap<CompKey, u32> = HashMap::new();
        count_branches(&STRUCTURAL, &mut counts);
        for (key, count) in counts {
            assert_le!(count, 1, "{key:?} is a roll-up in {count} places");
        }
    }

    #[test]
    fn children_are_unique_and_non_self() {
        for key in CompKey::iter() {
            let children = key.children();
            let unique: HashSet<CompKey> = children.iter().copied().collect();
            assert_eq!(unique.len(), children.len(), "{key:?} has duplicate parts");
            assert!(!children.contains(&key), "{key:?} is its own part");
        }
    }

    /// `display_hierarchy_ordered` is a faithful pre-order: shared keys recur (once per parent),
    /// roots are its depth-0 entries, and depth never jumps up by more than one.
    #[test]
    fn ordered_is_a_faithful_preorder() {
        let ordered = display_hierarchy_ordered();

        // MilkFat recurs: under MilkSolids (depth 1) then TotalFats (depth 2).
        let milk_fat = Comp(MilkFat);
        let milk_fat_depths: Vec<u32> = ordered
            .iter()
            .filter(|(key, _)| *key == milk_fat)
            .map(|&(_, depth)| depth)
            .collect();
        assert_eq!(milk_fat_depths, vec![1, 2]);

        // The roots are exactly the depth-0 entries, in order.
        let depth_zero: Vec<PropKey> = ordered
            .iter()
            .filter(|(_, depth)| *depth == 0)
            .map(|&(key, _)| key)
            .collect();
        assert_eq!(display_hierarchy_roots(), depth_zero.as_slice());

        // Pre-order shape: each step descends by at most one level.
        for pair in ordered.windows(2) {
            assert_le!(pair[1].1, pair[0].1 + 1, "depth jumps from {} to {}", pair[0].1, pair[1].1);
        }
    }

    #[test]
    fn display_forest_contains_every_prop_key() {
        fn collect(nodes: &[HierarchyNode<PropKey>], seen: &mut HashSet<PropKey>) {
            for node in nodes {
                let _ = seen.insert(node.key);
                collect(&node.children, seen);
            }
        }
        let mut seen = HashSet::new();
        collect(display_hierarchy(), &mut seen);

        let missing: Vec<PropKey> = CompKey::iter()
            .map(Comp)
            .chain(RatioKey::iter().map(Ratio))
            .chain(FpdKey::iter().map(Fpd))
            .filter(|key| !seen.contains(key))
            .collect();

        assert!(missing.is_empty(), "display forest is missing {} key(s): {missing:?}", missing.len());
    }
}
