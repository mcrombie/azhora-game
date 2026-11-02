import {elapsedTimeLabel} from '../../experiments/day-night/opening-time-label.js';
import {openingTimelineText} from '../../experiments/day-night/opening-presentation.js';

// Food is calculated by the campaign once per completed strategic tick.
// The elapsed campaign presents that same tick as a minute, including waits.
export function foodReportTime(state,clock){
  const elapsed=!!clock?.sharedOpening;
  const text=value=>elapsed?openingTimelineText(value,clock)
    .replace(/last completed day/g,'last completed campaign minute')
    .replace(/next day/g,'next campaign minute')
    .replace(/last day/g,'last campaign minute')
    .replace(/more days at this deficit/g,'more campaign minutes at this deficit'):value;
  return {
    heading:elapsed?`Adventure ${elapsedTimeLabel(state.day*60)}`:`Day ${state.day}`,
    period:state.day?(elapsed?'Last completed campaign minute; supplies update once per adventure minute.':'Last completed day')
      :elapsed?'Starting reserves; supplies update after the first adventure minute.':'Starting reserves; advance the campaign to see daily deliveries.',
    pending:text('Changes are set for the next day; the totals still describe the last completed day.'),text,
  };
}
