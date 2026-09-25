import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';
import { fetchFormFields, fetchForms } from './editor-forms.js';

/**
 * The site's Gravity Forms, by name, and the fields of the chosen one.
 * `status` is loading, ready, or unavailable (the plugin is off, or the editor
 * can't read forms). A response that arrives after the block moved on, to
 * another form or away, is ignored (INSP-12). Nothing here writes an attribute.
 *
 * @param {number} formId The saved form, or 0.
 * @return {{status: string, forms: Array, fields: Array|null}}
 */
export function useGravityForms(formId) {
  const [forms, setForms] = useState(null);
  const [loaded, setLoaded] = useState({ id: 0, fields: null });

  useEffect(() => {
    let current = true;

    fetchForms(apiFetch).then((list) => {
      if (current) setForms(list ?? false);
    });

    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    if (!formId) return undefined;
    let current = true;

    fetchFormFields(apiFetch, formId).then((fields) => {
      if (current) setLoaded({ id: formId, fields });
    });

    return () => {
      current = false;
    };
  }, [formId]);

  return {
    status: forms === null ? 'loading' : forms === false ? 'unavailable' : 'ready',
    forms: forms || [],
    fields: loaded.id === formId ? loaded.fields : null,
  };
}
