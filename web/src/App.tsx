import { useRoute } from "./lib/router";
import { LandingPage } from "./features/landing/LandingPage";
import { Workspace } from "./features/workspace/Workspace";

export function App() {
  const route = useRoute();
  // "/" → marketing landing; everything else → the operator workspace.
  return route === "/" ? <LandingPage /> : <Workspace />;
}
