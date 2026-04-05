import nerdamer from 'nerdamer';
import 'nerdamer/Solve.js'; // Requires the solver extension

try {
  const eq = "V = I * R";
  const sol1 = nerdamer(eq).solveFor("I");
  console.log("Sol for I:", sol1.toString());

  const eq2 = "K = 0.5 * m * (v^2)";
  const sol2 = nerdamer(eq2).solveFor("v");
  console.log("Sol for v:", sol2.toString());
} catch(e) {
  console.error("Nerdamer error:", e);
}
