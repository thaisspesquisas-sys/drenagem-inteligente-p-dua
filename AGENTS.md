<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Engineering formulas live as pure, versioned functions in src/lib/hydraulics.ts with reference-value tests; every saved calculation stores inputs + method_version so results are reproducible.
- Authorization is enforced in Postgres (user_roles + has_role/can_edit, RLS, guard triggers such as the simulation "concluída" guard); UI role checks are cosmetic only.
- Protected pages live under src/routes/_authenticated/ (client-only gate); browser-only libs like Leaflet are imported dynamically inside effects.
