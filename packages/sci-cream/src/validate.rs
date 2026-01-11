use crate::error::{Error, Result};

pub trait Validate {
    type Type;

    fn validate(&self) -> Result<Self::Type>;
}

pub fn assert_are_positive(values: &[f64]) -> Result<()> {
    for &value in values {
        if value < 0.0 {
            return Err(Error::CompositionNotPositive(value));
        }
    }
    Ok(())
}

pub fn is_within_100_percent(value: f64) -> bool {
    (0.0..=100.0).contains(&value)
}

pub fn assert_within_100_percent(value: f64) -> Result<()> {
    if is_within_100_percent(value) {
        Ok(())
    } else {
        Err(Error::CompositionNotWithin100Percent(value))
    }
}

pub fn assert_is_100_percent(value: f64) -> Result<()> {
    if (value - 100.0).abs() < f64::EPSILON {
        Ok(())
    } else {
        Err(Error::CompositionNot100Percent(value))
    }
}

pub fn assert_is_subset(subset: f64, superset: f64, description: &str) -> Result<()> {
    if subset <= superset {
        Ok(())
    } else {
        Err(Error::InvalidComposition(format!("{description}: {subset} > {superset}")))
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
mod tests {
    use super::*;

    #[test]
    fn must_use_functionality() {
        #[expect(unused_must_use)]
        assert_within_100_percent(50.0);
    }
}
