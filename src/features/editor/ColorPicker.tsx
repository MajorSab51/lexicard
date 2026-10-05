import { Check } from 'lucide-react';
import { SET_COLOR_CLASSES } from '@/components/setColors';
import { SET_COLORS, type SetColor } from '@/domain/models';
import { t } from '@/i18n';

interface ColorPickerProps {
  value: SetColor;
  onChange: (color: SetColor) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <fieldset>
      <legend className="mb-1.5 font-medium">{t('editor.color')}</legend>
      <div className="flex flex-wrap gap-2">
        {SET_COLORS.map((color) => (
          <label
            key={color}
            title={t(`colors.${color}`)}
            className={`relative flex size-10 cursor-pointer items-center justify-center rounded-full ${SET_COLOR_CLASSES[color]} ring-offset-2 ring-offset-surface has-checked:ring-2 has-checked:ring-fg has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-focus`}
          >
            <input
              type="radio"
              name="set-color"
              value={color}
              checked={value === color}
              onChange={() => {
                onChange(color);
              }}
              className="sr-only"
            />
            <span className="sr-only">{t(`colors.${color}`)}</span>
            {value === color && <Check aria-hidden="true" className="size-5 text-white" />}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
