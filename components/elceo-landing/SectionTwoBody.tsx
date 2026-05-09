import { AboutPocket } from './AboutPocket';
import { BlogResearchPocket } from './BlogResearchPocket';
import { MacroContextPocket } from './MacroContextPocket';
import { MediaGalleryPocket } from './MediaGalleryPocket';
import { NeonTieSpine } from './NeonTieSpine';
import { PocketPanel } from './PocketPanel';

export function SectionTwoBody() {
  return <section className="elceo-body"><div className="tl"><PocketPanel title="Real-Time Macro Context"><MacroContextPocket /></PocketPanel></div><div className="tr"><PocketPanel title="Media Gallery"><MediaGalleryPocket /></PocketPanel></div><NeonTieSpine /><div className="bl"><PocketPanel title="Market Intelligence Log"><BlogResearchPocket /></PocketPanel></div><div className="br"><PocketPanel title="About ELCEO"><AboutPocket /></PocketPanel></div></section>;
}
