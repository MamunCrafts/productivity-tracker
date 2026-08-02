import { Fragment } from "react";
import type { Inline } from "@/types/notes";
import { isRenderableImage } from "@/lib/noteView";

/**
 * Inline formatting inside a paragraph, heading or table cell.
 *
 * Nothing here comes from `dangerouslySetInnerHTML` — the tree is JSON we
 * built ourselves, and every leaf is escaped text, so an imported file can't
 * inject markup no matter what it contains.
 */
export function Inlines({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((node, i) => (
        <Fragment key={i}>
          <InlineNode node={node} />
        </Fragment>
      ))}
    </>
  );
}

function InlineNode({ node }: { node: Inline }) {
  switch (node.t) {
    case "text":
      return <>{node.v}</>;

    case "strong":
      return (
        <strong className="font-semibold text-ink">
          <Inlines nodes={node.c} />
        </strong>
      );

    case "em":
      return (
        <em className="italic">
          <Inlines nodes={node.c} />
        </em>
      );

    case "del":
      return (
        <del className="text-ink-3 decoration-ink-3">
          <Inlines nodes={node.c} />
        </del>
      );

    case "code":
      return (
        <code className="rounded border border-line bg-surface-2 px-1 py-0.5 font-mono text-[0.85em] text-ink">
          {node.v}
        </code>
      );

    case "link": {
      /**
       * A `#slug` href points at a heading in this same note — the সূচিপত্র
       * most imported files open with. It has to navigate in place: opening
       * it in a new tab loads a second copy of the page and never scrolls,
       * which reads as a click that reloaded and did nothing.
       *
       * Headings render with `id={slug}` and `scroll-mt-20` (BlockRenderer),
       * so the browser's own fragment jump lands them clear of the nav. Only
       * links that actually leave the note get `_blank`.
       */
      const internal = node.href.startsWith("#");
      return (
        <a
          href={node.href}
          target={internal ? undefined : "_blank"}
          rel={internal ? undefined : "noreferrer noopener"}
          // Amber is reserved for focus and primary actions, so a link gets
          // the underline rather than the accent colour.
          className="underline decoration-line-2 underline-offset-[3px] transition-colors hover:decoration-ink-2"
        >
          <Inlines nodes={node.c} />
        </a>
      );
    }

    case "img":
      return isRenderableImage(node.url) ? (
        // Arbitrary remote sources from an imported file; next/image needs
        // configured domains, which an unknown host can't satisfy.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={node.url}
          alt={node.alt}
          className="inline-block max-w-full align-text-bottom"
        />
      ) : (
        <MissingAsset alt={node.alt} inline />
      );

    case "br":
      return <br />;
  }
}

/**
 * A relative image path has no file behind it — you imported the markdown,
 * not the folder it lived in. Showing the alt text in place beats a broken
 * image glyph, and makes it obvious what's missing rather than what's broken.
 */
export function MissingAsset({
  alt,
  inline = false,
}: {
  alt: string;
  inline?: boolean;
}) {
  const label = alt.trim() || "image not imported";
  return inline ? (
    <span className="rounded border border-dashed border-line-2 px-1.5 py-0.5 text-[0.85em] text-ink-3">
      {label}
    </span>
  ) : (
    <span className="flex items-center justify-center rounded-lg border border-dashed border-line-2 px-4 py-8 text-center text-sm text-ink-3">
      {label}
    </span>
  );
}
