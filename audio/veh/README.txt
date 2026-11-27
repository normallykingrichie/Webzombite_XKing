Vehicle sounds: ONE mp3 per vehicle (the full mix) + vehicles.json (the cue sheet).
The game loads vehicles.json once and the mp3 of each vehicle it needs, then plays slices by time (one-shots) or loops a steady plateau (idle / low / high).
"int" = cabin recording (first half of every mix), "ext" = outside recording (second half). To fix a cue, edit the seconds in vehicles.json - no re-export needed.
Cues missing for a vehicle fall back to "universal" (taken from the truck mix).
