#[cfg(feature = "diesel")]
diesel::table! {
    ingredients (id) {
        id -> Int4,
        name -> Varchar,
        category -> Varchar,
        spec -> Varchar,
    }
}
