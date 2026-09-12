"""
NER Extractor Module for FIR Narrative Text.
Extracts named entities, locations, and suspect identifiers from police FIR text.
Per blueprint.md Section 4 & Section 21.

Note: In Stage 6 / Stage 10 MVP scope, entity resolution primarily operates on
structured device/phone hashes. This module provides regex and token-based entity
extraction hooks for FIR text analysis.
"""

import re
from typing import Any, Dict, List


def extract_entities_from_text(fir_text: str) -> List[Dict[str, Any]]:
    """
    Extracts structured entities (PHONE, LOCATION, PERSON) from FIR narrative text.
    """
    if not fir_text or not isinstance(fir_text, str):
        return []

    entities = []

    # 1. Regex for phone numbers
    phone_pattern = r"(?:\+91[\-\s]?)?[6-9]\d{9}"
    for match in re.finditer(phone_pattern, fir_text):
        entities.append({
            "text": match.group(0),
            "label": "PHONE",
            "start": match.start(),
            "end": match.end()
        })

    # 2. Location keywords commonly found in Indian FIRs
    location_pattern = r"\b(?:Road|Street|Nagar|Layout|Cross|Main|Colony|Sector|Market|Showroom|Junction)\b"
    for match in re.finditer(location_pattern, fir_text, re.IGNORECASE):
        entities.append({
            "text": match.group(0),
            "label": "GPE",
            "start": match.start(),
            "end": match.end()
        })

    return entities
