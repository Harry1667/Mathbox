import nerdamer from 'nerdamer';
import 'nerdamer/Solve.js';
import * as mathjs from 'mathjs';

try {
  const eq = "K = 0.5 * m * (v^2)";
  const sol = nerdamer(eq).solveFor("v").toString();
  console.log("Sol string:", sol);
  
  const roots = sol.split(',');
  console.log("Roots:");
  for (const rootStr of roots) {
     const scope = { K: 10, m: 5 };
     // Let's replace any square root terms or things just to be sure. mathjs can evaluate nerdamer output directly?
     // nerdamer format: `m^(-1)*sqrt(2)*sqrt(K)*sqrt(m)`
     const num = mathjs.evaluate(rootStr, scope);
     console.log("Root evaluate:", rootStr, "=>", num);
  }

} catch(e) {
  console.error(e);
}
