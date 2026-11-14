import { Card, CardContent, CardFooter } from '../components/ui/shadcn/card';
import {PulsePanelHeading} from '../components/ui/PulsePatterns';

/** Shared analytics surface: heading (with optional actions), content, optional methodology.
 * Put filters, toggles or tags that scope the chart in `actions`; put caveats in `footer`. */
export default function AnalyticsPanel({ title, description, children, footer, className, label, actions, icon }) {
  return <Card className={'pu-analytics-panel '+(className||'')} role="region" aria-label={label || title}>
    <PulsePanelHeading title={title} description={description} icon={icon}>{actions}</PulsePanelHeading>
    <CardContent>{children}</CardContent>
    {footer && <CardFooter><p className="po-panel-note">{footer}</p></CardFooter>}
  </Card>;
}
