import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  currencies,
  currencyCodes,
  type CurrencyCode,
} from '@/constants/currencies';
import { theme } from '@/constants/theme';

type CurrencyMenuProps = {
  currency: CurrencyCode;
  onSelect: (currency: CurrencyCode) => void;
};

export function CurrencyMenu({ currency, onSelect }: CurrencyMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectCurrency = (nextCurrency: CurrencyCode) => {
    onSelect(nextCurrency);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Choose display currency"
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen((open) => !open)}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}>
        <Text style={styles.triggerText}>{currencies[currency].code}</Text>
        <SymbolView
          name={{
            ios: isOpen ? 'chevron.up' : 'chevron.down',
            android: isOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down',
            web: isOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down',
          }}
          size={16}
          tintColor={theme.colors.textSecondary}
        />
      </Pressable>

      {isOpen && (
        <View accessibilityRole="menu" style={styles.menu}>
          <Text style={styles.menuLabel}>DISPLAY CURRENCY</Text>
          {currencyCodes.map((currencyCode) => {
            const option = currencies[currencyCode];
            const isSelected = currencyCode === currency;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={currencyCode}
                onPress={() => selectCurrency(currencyCode)}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.selectedOption,
                  pressed && styles.optionPressed,
                ]}>
                <View>
                  <Text style={styles.optionCode}>{option.code}</Text>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                </View>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  trigger: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  triggerPressed: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  triggerText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  menu: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 8,
    minWidth: 184,
    padding: 6,
    position: 'absolute',
    right: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    top: 44,
  },
  menuLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  option: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  selectedOption: {
    backgroundColor: theme.colors.surface,
  },
  optionPressed: {
    backgroundColor: theme.colors.border,
  },
  optionCode: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  optionLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  checkmark: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
});
