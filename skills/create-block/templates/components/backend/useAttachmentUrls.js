import { useSelect } from '@wordpress/data';

export function useAttachmentUrls(imageIds) {
  const ids = [...new Set(imageIds.map(Number).filter((id) => id > 0))];
  return useSelect(
    (select) =>
      Object.fromEntries(
        ids.map((id) => {
          const item = select('core').getMedia(id);
          const url =
            item?.source_url ||
            item?.media_details?.sizes?.full?.source_url ||
            item?.media_details?.sizes?.large?.source_url ||
            item?.guid?.rendered ||
            '';
          return [id, url];
        }),
      ),
    [ids.join(',')],
  );
}
