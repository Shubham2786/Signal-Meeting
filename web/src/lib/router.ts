import { useEffect, useState } from "react";

/** App routes. Hash-based to avoid a router dependency and server config. */
export type Route = "/" | "/app" | "/dashboard" | "/new";

function parse(): Route {
    const raw = window.location.hash.replace(/^#/, "") || "/";
    if (raw.startsWith("/dashboard")) return "/dashboard";
    if (raw.startsWith("/new")) return "/new";
    if (raw.startsWith("/app")) return "/app";
    return "/";
}

export function navigate(route: Route): void {
    if (window.location.hash !== `#${route}`) {
        window.location.hash = route;
    }
    // Ensure top of view on route change.
    window.scrollTo({ top: 0 });
}

/** Subscribe to hash route changes. */
export function useRoute(): Route {
    const [route, setRoute] = useState<Route>(parse);
    useEffect(() => {
        const onChange = () => setRoute(parse());
        window.addEventListener("hashchange", onChange);
        return () => window.removeEventListener("hashchange", onChange);
    }, []);
    return route;
}
