import { GameShell } from "@/components/GameShell";

/**
 * Home route. The page itself is a Server Component; all interactivity lives in
 * <GameShell>, which lazy-loads the WebGL canvas on the client only.
 */
export default function Home() {
  return <GameShell />;
}
