import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { closeSmall } from './coreIcons.jsx';

/**
 * The one control that removes an image: core's close icon in a dark round
 * button that reads over any photo. Same 32px size as every editor icon button.
 */
export function RemoveImageButton({
    label = __('Remove image', '__TEXT_DOMAIN__'),
    onClick,
    ...rest
}) {
    return (
        <Button
            icon={closeSmall}
            label={label}
            showTooltip
            size="compact"
            onClick={(event) => {
                // The image frame behind the button opens the media library on click.
                event.preventDefault();
                event.stopPropagation();
                onClick();
            }}
            style={{
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.75)',
                color: '#fff',
                boxShadow: '0 0 0 2px #fff, 0 2px 6px rgba(0, 0, 0, 0.3)',
            }}
            {...rest}
        />
    );
}
