import { InlineAssetSvg } from './svg/InlineAssetSvg';
import { SectionTwoPocket } from './SectionTwoPocket';
import { SectionTwoTie } from './SectionTwoTie';

export function SectionTwoBody() {
  return (
    <section className="elceo-section-two" aria-label="ELCEO body section">
      <div className="elceo-section-two-stage">
        <InlineAssetSvg assetName="section_2_layout" className="elceo-section-two-layout-guide" />
        <SectionTwoTie />

        <SectionTwoPocket assetName="pocket_tile_1" slotClassName="slot-left-top" eyebrow="LIVE MACRO" title="Real-Time Macro Context">
          <ul><li>CPI</li><li>10Y Yield</li><li>DXY Index</li><li>VIX</li><li>Liquidity</li><li>Updated: UTC --:--</li></ul>
        </SectionTwoPocket>

        <SectionTwoPocket assetName="pocket_tile_2" slotClassName="slot-right-top" eyebrow="VISUAL FEED" title="Media Gallery">
          <p>Pictures · Videos</p><p className="mini">[01] [02] [03] ▶ Video</p>
        </SectionTwoPocket>

        <SectionTwoPocket assetName="pocket_tile_3" slotClassName="slot-left-middle" eyebrow="RESEARCH" title="Market Intelligence Log / Blog">
          <ul><li>Macro explainer</li><li>Asset intelligence note</li><li>Glossary / education link</li></ul><p className="cta">Read Research</p>
        </SectionTwoPocket>

        <SectionTwoPocket assetName="pocket_tile_4" slotClassName="slot-right-middle" eyebrow="ABOUT" title="About ELCEO">
          <p>ELCEO is a Market Reasoning OS. It transforms market evidence into explainable context. Decision support, not a promise of profit.</p>
        </SectionTwoPocket>

        <SectionTwoPocket assetName="pocket_tile_5" slotClassName="slot-left-bottom" eyebrow="MARKETS" title="Asset Coverage">
          <ul><li>XAU/USD</li><li>EUR/USD</li><li>GBP/USD</li><li>USD/JPY</li><li>BTC/USD</li><li>Nasdaq 100</li></ul>
        </SectionTwoPocket>

        <SectionTwoPocket assetName="pocket_tile_6" slotClassName="slot-right-bottom" eyebrow="ENGINE" title="Evidence / Reasoning Engine">
          <ul><li>Evidence Quality</li><li>Freshness</li><li>Conflict Detection</li><li>Asset Weighting</li><li>Market Cognition</li></ul>
        </SectionTwoPocket>

        <div className="elceo-f2b-proof" aria-hidden="true">F2B-SECTION2-PROOF</div>
      </div>
    </section>
  );
}
