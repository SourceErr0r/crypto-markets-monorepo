import {
  DetailSection,
  MutedText,
  RangeBar,
  Row,
  Stat,
} from "@/components/coin-details-ui";
import type { CurrencyCode } from "@/constants/currencies";
import {
  formatAmount,
  formatDate,
  positiveOrNull,
  rangePercentage,
} from "@/utils/coin-details";
import { formatDecimal, formatPrice } from "@/utils/formatters";
import type { CryptocurrencyDetails } from "@crypto-markets/api";

type SectionProps = { coin: CryptocurrencyDetails; currency: CurrencyCode };

export function MarketOverview({ coin, currency }: SectionProps) {
  const market = coin.market_data;

  return (
    <DetailSection title="Market overview">
      {/* Separate rows on purpose: these values are long and wrap when two share a row. */}
      <Row>
        <Stat
          label="Market cap"
          value={formatAmount(market.market_cap[currency], currency)}
        />
      </Row>
      <Row>
        <Stat
          label="24h trading volume"
          value={formatAmount(market.total_volume[currency], currency)}
        />
      </Row>
    </DetailSection>
  );
}

export function DayRange({ coin, currency }: SectionProps) {
  const market = coin.market_data;
  const price = market.current_price[currency] ?? null;
  const low = positiveOrNull(market.low_24h[currency]);
  const high = positiveOrNull(market.high_24h[currency]);
  const position = rangePercentage(price, low, high);

  return (
    <DetailSection title="24-hour price range">
      <Row>
        <Stat label="Low" value={formatPrice(low, currency)} />
        <Stat label="High" value={formatPrice(high, currency)} />
      </Row>
      {position !== null ? (
        <>
          <RangeBar
            percentage={position}
            label="Current price within the 24-hour low and high"
          />
          <MutedText>
            Current price within the daily range
          </MutedText>
        </>
      ) : (
        <MutedText>
          {low !== null && low === high
            ? "Price was unchanged over this range."
            : "Price range unavailable."}
        </MutedText>
      )}
    </DetailSection>
  );
}

export function Supply({ coin }: Pick<SectionProps, "coin">) {
  const market = coin.market_data;
  const symbol = coin.symbol.toUpperCase();
  const circulatingPercentage = rangePercentage(
    market.circulating_supply,
    0,
    market.max_supply,
  );

  return (
    <DetailSection title="Supply">
      <Row>
        <Stat
          label="Circulating"
          value={formatAmount(market.circulating_supply)}
          caption={symbol}
        />
        <Stat
          label="Maximum"
          value={formatAmount(market.max_supply)}
          caption={market.max_supply === null ? "Not reported" : symbol}
        />
        <Stat
          label="Total supply"
          value={formatAmount(market.total_supply)}
          caption={symbol}
        />
      </Row>
      {circulatingPercentage !== null && (
        <>
          <RangeBar
            percentage={circulatingPercentage}
            label="Percentage of maximum supply in circulation"
          />
          <MutedText>
            {formatDecimal(circulatingPercentage, 1)}% of maximum supply in
            circulation
          </MutedText>
        </>
      )}
    </DetailSection>
  );
}

export function AllTimePrices({ coin, currency }: SectionProps) {
  const market = coin.market_data;

  return (
    <DetailSection title="All-time prices">
      <Row>
        <Stat
          label="All-time high"
          value={formatPrice(market.ath[currency] ?? null, currency)}
          caption={formatDate(market.ath_date[currency])}
        />
        <Stat
          label="All-time low"
          value={formatPrice(market.atl[currency] ?? null, currency)}
          caption={formatDate(market.atl_date[currency])}
        />
      </Row>
    </DetailSection>
  );
}
