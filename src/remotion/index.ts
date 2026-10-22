// Entry point of the export bundle (deployed to Remotion Lambda), not used by the Next.js app.
import { registerRoot } from "remotion";

import { RemotionRoot } from "./root";

registerRoot(RemotionRoot);
