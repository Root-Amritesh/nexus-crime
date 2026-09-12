"""
Indian Names and Entity Gazetteer Dictionary & Matcher.
Per blueprint.md Section 4 & Section 21.
"""

from typing import List, Set

COMMON_INDIAN_FIRST_NAMES: Set[str] = {
    "amit", "rahul", "rohit", "vikram", "rajesh", "suresh", "ramesh", "anil",
    "priya", "pooja", "neha", "anjali", "sunita", "deepa", "kavita", "rekha",
    "mohammed", "ali", "ahmed", "khan", "sharma", "verma", "singh", "kumar"
}

CRIME_KEYWORDS: Set[str] = {
    "theft", "burglary", "robbery", "extortion", "assault", "murder",
    "fraud", "conspiracy", "syndicate", "hawala", "smuggling"
}


def lookup_name_in_gazetteer(token: str) -> bool:
    """Checks if a lowercased word exists in the common name gazetteer."""
    return token.strip().lower() in COMMON_INDIAN_FIRST_NAMES


def extract_crime_keywords(text: str) -> List[str]:
    """Finds crime-related keywords present in the text."""
    lowered = text.lower()
    return [kw for kw in CRIME_KEYWORDS if kw in lowered]
