import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/clerk-react";

// Note: For Convex + Clerk integration, you need to create a JWT template
// in Clerk Dashboard named "convex" that includes the Convex issuer URL.
// See: https://docs.convex.dev/auth/clerk

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

interface ConvexClientProviderProps {
  children: ReactNode;
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

export { convex };
