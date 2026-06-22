//! Internal macro for generating field-update methods on composition structs.

/// Generates a by-value, chainable field-update method per listed `field: Type`.
///
/// Each entry expands to a `const fn` named after the field, returning `Self` with that field
/// replaced. Stamp the invocation inside an `impl` block (write the `impl` header by hand so
/// generic structs work); omit a field to skip generating its method.
macro_rules! field_update_methods {
    ( $( $field:ident : $ty:ty ),+ $(,)? ) => {
        $(
            #[doc = concat!(
                "Field-update method for [`", stringify!($field),
                "`](field@Self::", stringify!($field), ")"
            )]
            #[must_use]
            pub const fn $field(self, $field: $ty) -> Self {
                Self { $field, ..self }
            }
        )+
    };
}

pub(crate) use field_update_methods;
