import type { KickOffDashboardViewModelV1 } from '@elceo/types';
export type KickOffPriceDomain={min:number;max:number};
export function getKickOffPriceDomain(chart:KickOffDashboardViewModelV1['chart']):KickOffPriceDomain{
  const values=[...chart.candles.flatMap(candle=>[candle.low,candle.high]),...chart.zones.flatMap(zone=>[zone.lower,zone.upper])].filter(Number.isFinite);if(values.length===0)return{min:0,max:1};let min=Math.min(...values),max=Math.max(...values);if(min===max){const pad=Math.max(Math.abs(min)*0.01,1e-6);min-=pad;max+=pad}else{const pad=(max-min)*0.05;min-=pad;max+=pad}return{min,max};
}
export function priceToKickOffY(price:number,domain:KickOffPriceDomain,height=320,padding=16){const usable=height-padding*2,ratio=(domain.max-price)/(domain.max-domain.min);return Math.min(height-padding,Math.max(padding,padding+ratio*usable));}
