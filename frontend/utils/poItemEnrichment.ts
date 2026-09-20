import { Article, PurchaseOrderItem } from "../types";
import { formatAssortment } from "./assortmentUtils";

const resolveCatalogImage = (article: Article, variant: any): string => {
  const variantColor = (variant?.color || "").trim().toLowerCase();
  const colorMedia = article.colorMedia || [];
  const mediaMatch = colorMedia.find(
    (media) => (media.color || "").trim().toLowerCase() === variantColor
  );
  const image = mediaMatch?.images?.find((entry) => entry.isCover)?.url ||
    mediaMatch?.images?.[0]?.url;

  return image || variant?.images?.[0] || article.imageUrl || "";
};

const normalizedId = (value: any): string =>
  String(value?.id || value?._id || value || "").trim().toLowerCase();

const normalizedSku = (value: any): string =>
  String(value || "").trim().toLowerCase();

// PO/Bill items saved before onlineMrp/offlineMrp/gender/assortment were
// tracked on the backend schema have those fields missing/blank — e.g.
// falling back to the single legacy `mrp` field for BOTH online and offline
// shows the same (online) number in both columns, which is wrong, and
// gender/assortment just don't display at all. Backfill all of these from
// the live catalog variant (via the item's own articleId/variantId)
// whenever the item's own saved values are missing. The image is always
// refreshed from the live catalogue when one is available, so CSV/catalogue
// image edits are reflected in existing POs. Used by both the PO screens and
// the Bill screens (a bill's items are a PO's items) so both stay consistent.
export const enrichItemsWithCatalogMrp = (
  items: PurchaseOrderItem[],
  articles: Article[]
): PurchaseOrderItem[] =>
  items.map((it) => {
    const itemArticleId = normalizedId(it.articleId);
    const itemVariantId = normalizedId(it.variantId);
    const itemSku = normalizedSku(it.sku);
    const article = articles.find(
      (a) =>
        normalizedId(a) === itemArticleId ||
        Boolean(
          itemSku &&
            a.variants?.some((variant: any) => normalizedSku(variant.sku) === itemSku)
        )
    );
    const variant = article?.variants?.find((v: any) =>
      normalizedId(v) === itemVariantId ||
      (itemSku && normalizedSku(v.sku) === itemSku)
    );
    if (!article) return it;
    const currentImage = variant
      ? resolveCatalogImage(article, variant)
      : article.imageUrl || "";

    if (!variant) {
      return currentImage && currentImage !== it.image
        ? { ...it, image: currentImage }
        : it;
    }

    return {
      ...it,
      onlineMrp: it.onlineMrp || (variant.onlineMrp || 0) * 24,
      offlineMrp: it.offlineMrp || (variant.offlineMrp || 0) * 24,
      gender: it.gender || article?.category || "",
      assortment: it.assortment || formatAssortment(variant.sizeQuantities),
      image: currentImage || it.image,
    };
  });
