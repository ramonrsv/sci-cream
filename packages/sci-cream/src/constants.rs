pub const ABV_TO_ABW_RATIO: f64 = 0.789;

// POD values are taken from Ice Cream, 7th Edition, Table 3.4, page 67
pub const GLUCOSE_POD: f64 = 80.4;
pub const FRUCTOSE_POD: f64 = 173.0;
pub const GALACTOSE_POD: f64 = 0.0; // @todo
pub const SUCROSE_POD: f64 = 100.0;
pub const LACTOSE_POD: f64 = 16.0;
pub const MALTOSE_POD: f64 = 32.0;

// PAC values calculated based on molar mass relative to that of sucrose of 342.30 g/mol, e.g.
// glucose has a molar mass of 180.16 g/mol, so its PAC is 342.30 / 180.16 * 100 = 190.
pub const GLUCOSE_PAC: f64 = 190.0;
pub const FRUCTOSE_PAC: f64 = 190.0;
pub const GALACTOSE_PAC: f64 = 190.0;
pub const SUCROSE_PAC: f64 = 100.0;
pub const LACTOSE_PAC: f64 = 100.0;
pub const MALTOSE_PAC: f64 = 100.0;

pub const SALT_PAC: f64 = 585.0;
pub const ALCOHOL_PAC: f64 = 740.0;

pub const CACAO_BUTTER_HF: f64 = 0.9;
pub const COCOA_SOLIDS_HF: f64 = 1.8;
pub const NUT_FAT_HF: f64 = 1.4;

pub const STD_MSNF_IN_MILK_SERUM: f64 = 0.09;
pub const STD_LACTOSE_IN_MSNF: f64 = 0.545;

pub const FPD_MSNF_FACTOR_FOR_CELSIUS: f64 = 2.37;
