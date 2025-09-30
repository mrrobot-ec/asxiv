export interface ArxivCategory {
  code: string;
  name: string;
}

const ARXIV_CATEGORIES: ArxivCategory[] = [
  { code: 'cs.AI', name: 'Artificial Intelligence' },
  { code: 'cs.CL', name: 'Computation and Language' },
  { code: 'cs.CV', name: 'Computer Vision and Pattern Recognition' },
  { code: 'cs.LG', name: 'Machine Learning' },
  { code: 'cs.NE', name: 'Neural and Evolutionary Computing' },
  { code: 'cs.RO', name: 'Robotics' },
  { code: 'math.AG', name: 'Algebraic Geometry' },
  { code: 'math.AT', name: 'Algebraic Topology' },
  { code: 'math.CO', name: 'Combinatorics' },
  { code: 'math.NT', name: 'Number Theory' },
  { code: 'math.ST', name: 'Statistics Theory' },
  { code: 'physics.quant-ph', name: 'Quantum Physics' },
  { code: 'physics.cond-mat', name: 'Condensed Matter' },
  { code: 'astro-ph', name: 'Astrophysics' },
  { code: 'hep-th', name: 'High Energy Physics - Theory' },
  { code: 'q-bio', name: 'Quantitative Biology' },
  { code: 'q-fin', name: 'Quantitative Finance' },
  { code: 'stat.ML', name: 'Machine Learning (Statistics)' },
  { code: 'stat.AP', name: 'Applications' },
  { code: 'econ.EM', name: 'Econometrics' }
];

export function getArxivCategories(): ArxivCategory[] {
  return ARXIV_CATEGORIES;
}
