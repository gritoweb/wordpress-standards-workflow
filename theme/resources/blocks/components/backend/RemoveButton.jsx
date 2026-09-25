import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { trash } from './coreIcons.jsx';

/**
 * The one delete control for every destructive action in a block: WordPress's
 * own trash icon button, so it looks and hovers exactly like core's.
 */
export function RemoveButton({
    label = __('Remove item', '__TEXT_DOMAIN__'),
    onClick,
    disabled = false,
    ...rest
}) {
    return (
        <Button
            icon={trash}
            label={label}
            showTooltip
            isDestructive
            size="compact"
            disabled={disabled}
            onClick={(event) => {
                // A row or card click behind the button must not also select it.
                event.stopPropagation();
                onClick();
            }}
            {...rest}
        />
    );
}
