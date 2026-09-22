import { useSelect } from '@wordpress/data';

export function useAttachmentUrls(imageIds) {
  const ids = [...new Set(imageIds.map(Number).filter((id) => id > 0))];
  return useSelect(
    (select) =>
      Object.fromEntries(
        ids.map((id) => [id, select('core').getMedia(id)?.source_url || '']),
      ),
    [ids.join(',')],
  );
}
