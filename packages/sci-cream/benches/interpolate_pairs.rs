use std::hint::black_box;

use criterion::{Criterion, criterion_group};

use sci_cream::util::{fast_interpolate_pairs, interpolate_pairs};

pub(crate) fn bench_interpolate_pairs(c: &mut Criterion) {
    let from = |p: &(u32, f64)| f64::from(p.0);
    let to = |p: &(u32, f64)| p.1;

    let pairs = (0..1000_u32).map(|i| (i, f64::from(i * 2))).collect::<Vec<_>>();

    // Test middle points to avoid fast paths at exact matches
    let near_start = 2.5;
    let near_end = 997.5;

    let sweep = |f: &dyn Fn(f64) -> f64| {
        for pair in &pairs[..999] {
            let _ = black_box(f(f64::from(pair.0) + 0.5));
        }
    };

    macro_rules! bench {
        ($name:expr, $body:expr) => {
            let _ = c.bench_function($name, |b| b.iter(|| black_box($body)));
        };
    }

    bench!("interpolate_pairs(sweep)", sweep(&|x| interpolate_pairs(&pairs, x, from, to)));
    bench!("fast_interpolate_pairs(sweep)", sweep(&|x| fast_interpolate_pairs(&pairs, x)));
    bench!("interpolate_pairs(near_start)", interpolate_pairs(&pairs, near_start, from, to));
    bench!("interpolate_pairs(near_end)", interpolate_pairs(&pairs, near_end, from, to));
    bench!("fast_interpolate_pairs(near_start)", fast_interpolate_pairs(&pairs, near_start));
    bench!("fast_interpolate_pairs(near_end)", fast_interpolate_pairs(&pairs, near_end));
}

criterion_group!(benches, bench_interpolate_pairs);
