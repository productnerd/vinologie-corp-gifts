// Resolve a public asset path against Vite's base URL so it works both at the
// dev root ("/") and under the GitHub Pages subpath ("/vinologie-corp-gifts/").
export const asset = (path) => import.meta.env.BASE_URL + path.replace(/^\//, '')
