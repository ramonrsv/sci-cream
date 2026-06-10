//! The composition hierarchy: how [`CompKey`] roll-ups decompose into their parts.
//!
//! Part/whole relationships overlap: [`CompKey::MilkFat`] is a part of both [`CompKey::TotalFats`]
//! (by macronutrient) and [`CompKey::MilkSolids`] (by source), because the composition decomposes
//! along two orthogonal axes (see [`Solids`] and [`SolidsBreakdown`]). So a key can have more than
//! one parent — the relation is a DAG. It is encoded here as a forest of [`HierarchyNode`] literals
//! in which a shared key simply appears under each of its parents.
//!
//! [`CompKey::children`] and [`CompKey::parents`] expose the edges (a roll-up's parts never exceed
//! it in any [`Composition`] — exactly, when residual-free); [`comp_hierarchy`] and the flattened
//! [`comp_hierarchy_ordered`] give the tree itself. How to project it — for instance keeping a
//! shared key's first occurrence so a UI renders each key once — is left to the caller.
//!
//! [`HierarchyNode`] is generic over the key type, so other keys (ratios, FPD, future nutrient
//! keys) can later form additional groupings.

use std::collections::HashMap;
use std::sync::LazyLock;

use serde::Serialize;

use crate::composition::CompKey;

#[cfg(doc)]
use crate::composition::{Composition, Solids, SolidsBreakdown};

/// A node in the composition hierarchy: a key and its direct children, each a node of the same kind.
///
/// `Serialize` flattens to `{ key, children }`, which is how the WASM layer hands the forest to JS.
#[derive(Debug, Clone, Copy, Serialize)]
pub struct HierarchyNode<K: 'static> {
    /// The key at this node.
    pub key: K,
    /// The node's direct children, in display order. Empty for a leaf.
    pub children: &'static [Self],
}

impl<K: 'static> HierarchyNode<K> {
    /// A roll-up branch node with the given direct children.
    #[must_use]
    pub const fn br(key: K, children: &'static [Self]) -> Self {
        Self { key, children }
    }

    /// A leaf node (no children).
    #[must_use]
    pub const fn lf(key: K) -> Self {
        Self { key, children: &[] }
    }
}

use HierarchyNode as N;

/// The composition hierarchy, as a forest of [`HierarchyNode`]s over [`CompKey`].
///
/// A DAG: keys shared between the macronutrient and source decompositions (the per-source fats and
/// milk proteins) appear in both. The macronutrient trees come first, so a shared key's first
/// occurrence is its macronutrient one.
static FOREST: &[HierarchyNode<CompKey>] = &[
    // Macronutrient decomposition.
    N::br(
        CompKey::TotalSolids,
        &[
            N::br(
                CompKey::TotalFats,
                &[
                    N::lf(CompKey::MilkFat),
                    N::lf(CompKey::CocoaButter),
                    N::lf(CompKey::NutFat),
                    N::lf(CompKey::EggFat),
                    N::lf(CompKey::OtherFats),
                ],
            ),
            N::br(
                CompKey::TotalSNF,
                &[
                    N::br(
                        CompKey::TotalCarbohydrates,
                        &[
                            N::br(
                                CompKey::TotalSugars,
                                &[
                                    N::lf(CompKey::Glucose),
                                    N::lf(CompKey::Fructose),
                                    N::lf(CompKey::Galactose),
                                    N::lf(CompKey::Sucrose),
                                    N::lf(CompKey::Lactose),
                                    N::lf(CompKey::Maltose),
                                    N::lf(CompKey::Trehalose),
                                ],
                            ),
                            N::br(
                                CompKey::TotalPolyols,
                                &[
                                    N::lf(CompKey::Erythritol),
                                    N::lf(CompKey::Maltitol),
                                    N::lf(CompKey::Sorbitol),
                                    N::lf(CompKey::Xylitol),
                                ],
                            ),
                            N::br(CompKey::TotalFiber, &[N::lf(CompKey::Inulin), N::lf(CompKey::Oligofructose)]),
                        ],
                    ),
                    N::br(CompKey::TotalProteins, &[N::lf(CompKey::MilkProteins)]),
                    N::br(
                        CompKey::TotalArtificial,
                        &[
                            N::lf(CompKey::Aspartame),
                            N::lf(CompKey::Cyclamate),
                            N::lf(CompKey::Saccharin),
                            N::lf(CompKey::Sucralose),
                            N::lf(CompKey::Steviosides),
                            N::lf(CompKey::Mogrosides),
                        ],
                    ),
                ],
            ),
        ],
    ),
    N::br(
        CompKey::TotalSweeteners,
        &[
            N::lf(CompKey::TotalSugars),
            N::lf(CompKey::TotalPolyols),
            N::lf(CompKey::TotalArtificial),
        ],
    ),
    N::br(
        CompKey::TotalPAC,
        &[
            N::lf(CompKey::PACsgr),
            N::lf(CompKey::PACslt),
            N::lf(CompKey::PACmlk),
            N::lf(CompKey::PACalc),
        ],
    ),
    N::br(
        CompKey::TotalStabilizers,
        &[
            N::lf(CompKey::Cornstarch),
            N::lf(CompKey::TapiocaStarch),
            N::lf(CompKey::Pectin),
            N::lf(CompKey::Gelatin),
            N::lf(CompKey::LocustBeanGum),
            N::lf(CompKey::GuarGum),
            N::lf(CompKey::Carrageenans),
            N::lf(CompKey::CarboxymethylCellulose),
            N::lf(CompKey::XanthanGum),
            N::lf(CompKey::SodiumAlginate),
            N::lf(CompKey::TaraGum),
        ],
    ),
    N::br(CompKey::TotalEmulsifiers, &[N::lf(CompKey::Lecithin)]),
    //
    // Ingredient-source decomposition: per-source part/whole identities. Shared keys repeat from
    // the macronutrient trees above — every occurrence is a real edge.
    N::br(
        CompKey::MilkSolids,
        &[
            N::lf(CompKey::MilkFat),
            N::br(CompKey::MSNF, &[N::br(CompKey::MilkSNFS, &[N::lf(CompKey::MilkProteins)])]),
        ],
    ),
    N::br(CompKey::CacaoSolids, &[N::lf(CompKey::CocoaButter), N::lf(CompKey::CocoaSolids)]),
    N::br(CompKey::NutSolids, &[N::lf(CompKey::NutFat), N::lf(CompKey::NutSNF)]),
    N::br(CompKey::EggSolids, &[N::lf(CompKey::EggFat), N::lf(CompKey::EggSNF)]),
];

/// Lazily-derived lookups over a forest (see [`Index::build`]).
struct Index {
    /// Each roll-up's direct parts, gathered from every occurrence.
    children: HashMap<CompKey, Vec<CompKey>>,
    /// Each key's parents (roll-ups listing it), in forest order.
    parents: HashMap<CompKey, Vec<CompKey>>,
    /// A pre-order of the forest: every node, paired with its depth (a shared key recurs).
    ordered: Vec<(CompKey, u32)>,
    /// The forest's top-level keys, in order.
    roots: Vec<CompKey>,
}

static INDEX: LazyLock<Index> = LazyLock::new(|| Index::build(FOREST));

impl Index {
    /// Walks `forest` once to populate every lookup.
    fn build(forest: &[HierarchyNode<CompKey>]) -> Self {
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
    fn collect_edges(&mut self, nodes: &[HierarchyNode<CompKey>]) {
        for node in nodes {
            if !node.children.is_empty() {
                let parts = node.children.iter().map(|child| child.key).collect();
                let _unused = self.children.insert(node.key, parts);
                for child in node.children {
                    self.parents.entry(child.key).or_default().push(node.key);
                }
                self.collect_edges(node.children);
            }
        }
    }

    /// Records a pre-order of `nodes`: every node paired with its depth (shared keys recur). The
    /// top-level keys (depth 0) are also collected as the forest's roots.
    fn collect_preorder(&mut self, nodes: &[HierarchyNode<CompKey>], depth: u32) {
        for node in nodes {
            self.ordered.push((node.key, depth));
            if depth == 0 {
                self.roots.push(node.key);
            }
            self.collect_preorder(node.children, depth + 1);
        }
    }
}

impl CompKey {
    /// The direct parts of this key in the composition hierarchy, in canonical order.
    ///
    /// Empty for a non-roll-up. The parts sum to no more than this key in any [`Composition`]
    /// (exactly, for residual-free roll-ups).
    #[must_use]
    pub fn children(self) -> &'static [Self] {
        match INDEX.children.get(&self) {
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
        match INDEX.parents.get(&self) {
            Some(parents) => parents,
            None => &[],
        }
    }

    /// Whether this key is a roll-up (has parts) in the composition hierarchy.
    #[must_use]
    pub fn is_rollup(self) -> bool {
        INDEX.children.contains_key(&self)
    }
}

/// The composition hierarchy forest. See the [module docs](self) for how it is read.
#[must_use]
pub const fn comp_hierarchy() -> &'static [HierarchyNode<CompKey>] {
    FOREST
}

/// A pre-order traversal of the forest, pairing each node with its depth.
///
/// Every node is listed, so a key shared by several roll-ups recurs — once under each parent, at
/// that parent's depth. Callers that render each key once de-duplicate as they see fit.
#[must_use]
pub fn comp_hierarchy_ordered() -> &'static [(CompKey, u32)] {
    &INDEX.ordered
}

/// The forest's top-level keys (those with no parents), in [`comp_hierarchy`] order.
#[must_use]
pub fn comp_hierarchy_roots() -> &'static [CompKey] {
    &INDEX.roots
}

#[cfg(all(test, feature = "database"))]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
mod tests {
    use std::collections::{HashMap, HashSet};
    use std::sync::LazyLock;

    use approx::assert_abs_diff_eq;
    use strum::IntoEnumIterator;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;
    use crate::composition::Composition;
    use crate::constants::COMPOSITION_EPSILON;
    use crate::database::IngredientDatabase;
    use crate::recipe::Recipe;

    static DB: LazyLock<IngredientDatabase> = LazyLock::new(IngredientDatabase::new_seeded_from_embedded_data);

    /// A composition spanning every ingredient source and many components, so that roll-up keys and
    /// their parts are all non-zero and the part/whole invariants are meaningfully exercised.
    static MIXED_COMP: LazyLock<Composition> = LazyLock::new(|| {
        Recipe::from_const_recipe(
            None,
            &[
                ("2% Milk", 50.0),
                ("70% Dark Chocolate", 10.0),
                ("Almond", 10.0),
                ("Egg Yolk", 8.0),
                ("Sucrose", 12.0),
                ("Erythritol", 4.0),
                ("Inulin Powder", 3.0),
                ("Cornstarch", 1.0),
                ("Guar Gum", 0.5),
                ("Salt", 0.3),
                ("40% ABV Spirit", 5.0),
            ],
            &DB,
        )
        .unwrap()
        .calculate_composition()
        .unwrap()
    });

    /// Every roll-up's parts sum to no more than the roll-up itself — the fundamental part/whole
    /// (additive) invariant, across every edge in the DAG.
    #[test]
    fn children_never_exceed_their_rollup() {
        let comp = &*MIXED_COMP;
        for key in CompKey::iter().filter(|key| key.is_rollup()) {
            let children_sum: f64 = key.children().iter().map(|&part| comp.get(part)).sum();
            assert!(
                children_sum <= comp.get(key) + COMPOSITION_EPSILON,
                "{key:?} parts sum {children_sum} exceeds roll-up {}",
                comp.get(key),
            );
        }
    }

    /// Residual-free roll-ups equal the sum of their hierarchy parts exactly (the rest are only
    /// bounded by them; see `children_never_exceed_their_rollup`). The parts come from
    /// [`CompKey::children`], so only *which* roll-ups are residual-free is stated here.
    #[test]
    fn exact_rollups_equal_their_children() {
        let comp = &*MIXED_COMP;
        let exact = [
            CompKey::TotalSolids,
            CompKey::TotalFats,
            CompKey::TotalPAC,
            CompKey::MilkSolids,
            CompKey::CacaoSolids,
            CompKey::NutSolids,
            CompKey::EggSolids,
        ];
        for rollup in exact {
            let parts_sum: f64 = rollup.children().iter().map(|&part| comp.get(part)).sum();
            assert_abs_diff_eq!(comp.get(rollup), parts_sum, epsilon = COMPOSITION_EPSILON);
        }
    }

    /// A key shared by two roll-ups lists both as parents, in forest order (macronutrient first),
    /// while [`children`] keeps both part/whole edges.
    #[test]
    fn shared_key_lists_all_its_parents() {
        // MilkFat is a part of both TotalFats (macronutrient) and MilkSolids (source).
        assert!(CompKey::TotalFats.children().contains(&CompKey::MilkFat));
        assert!(CompKey::MilkSolids.children().contains(&CompKey::MilkFat));
        assert_eq!(CompKey::MilkFat.parents(), &[CompKey::TotalFats, CompKey::MilkSolids]);

        // MilkProteins is a part of both TotalProteins (macronutrient) and MilkSNFS (source).
        assert_eq!(CompKey::MilkProteins.parents(), &[CompKey::TotalProteins, CompKey::MilkSNFS]);
    }

    /// Milk's non-fat sub-components nest as a subset chain under [`CompKey::MilkSolids`]: each
    /// link carries a residual (milk sugars, then minerals), so they are non-exact subsets.
    #[test]
    fn milk_subcomponents_nest_under_milk_solids() {
        assert_eq!(CompKey::MilkSolids.children(), &[CompKey::MilkFat, CompKey::MSNF]);
        assert_eq!(CompKey::MSNF.children(), &[CompKey::MilkSNFS]);
        assert_eq!(CompKey::MilkSNFS.children(), &[CompKey::MilkProteins]);

        let comp = &*MIXED_COMP;
        assert_lt!(comp.get(CompKey::MilkSNFS), comp.get(CompKey::MSNF));
        assert_lt!(comp.get(CompKey::MilkProteins), comp.get(CompKey::MilkSNFS));
    }

    /// Each key appears as a roll-up (branch) at most once, so [`CompKey::children`] is
    /// unambiguous, even though leaves may repeat across groups.
    #[test]
    fn each_key_is_a_branch_at_most_once() {
        fn count_branches(nodes: &[HierarchyNode<CompKey>], counts: &mut HashMap<CompKey, u32>) {
            for node in nodes {
                if !node.children.is_empty() {
                    *counts.entry(node.key).or_default() += 1;
                    count_branches(node.children, counts);
                }
            }
        }
        let mut counts: HashMap<CompKey, u32> = HashMap::new();
        count_branches(comp_hierarchy(), &mut counts);
        for (key, count) in counts {
            assert_le!(count, 1, "{key:?} is a roll-up in {count} places");
        }
    }

    /// Roll-up parts are unique and never include the roll-up itself.
    #[test]
    fn children_are_unique_and_non_self() {
        for key in CompKey::iter() {
            let children = key.children();
            let unique: HashSet<CompKey> = children.iter().copied().collect();
            assert_eq!(unique.len(), children.len(), "{key:?} has duplicate parts");
            assert!(!children.contains(&key), "{key:?} is its own part");
        }
    }

    /// `comp_hierarchy_ordered` is a faithful pre-order: a shared key recurs (once per parent), the
    /// roots are exactly its depth-0 entries, and depth never jumps up by more than one step.
    #[test]
    fn ordered_is_a_faithful_preorder() {
        let ordered = comp_hierarchy_ordered();

        // MilkFat recurs: under TotalFats (depth 2) then MilkSolids (depth 1).
        let milk_fat_depths: Vec<u32> = ordered
            .iter()
            .filter(|(key, _)| *key == CompKey::MilkFat)
            .map(|&(_, depth)| depth)
            .collect();
        assert_eq!(milk_fat_depths, vec![2, 1]);

        // The roots are exactly the depth-0 entries, in order.
        let depth_zero: Vec<CompKey> = ordered
            .iter()
            .filter(|(_, depth)| *depth == 0)
            .map(|&(key, _)| key)
            .collect();
        assert_eq!(comp_hierarchy_roots(), depth_zero.as_slice());

        // Pre-order shape: each step descends by at most one level.
        for pair in ordered.windows(2) {
            assert_le!(pair[1].1, pair[0].1 + 1, "depth jumps from {} to {}", pair[0].1, pair[1].1);
        }
    }
}
