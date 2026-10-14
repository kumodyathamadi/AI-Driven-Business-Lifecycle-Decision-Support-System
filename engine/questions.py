"""
Component 2 — Deterministic Fact-to-Question Lookup Table
Generates follow-up questions from missing facts without using an LLM.
Includes bilingual labels (English and Sinhala).
"""

from __future__ import annotations

from typing import Any, Dict, List

FACT_QUESTION_MAP: Dict[str, Dict[str, Any]] = {
    "province": {
        "fact": "province",
        "question_en": "In which province is your business registered or operating?",
        "question_si": "ඔබගේ ව්‍යාපාරය ලියාපදිංචි කර හෝ ක්‍රියාත්මක වන්නේ කුමන පළාතේද?",
        "type": "select",
        "options": ["Western Province", "Central Province", "Southern Province", "Other"],
    },
    "business_type": {
        "fact": "business_type",
        "question_en": "What is the primary category of your business?",
        "question_si": "ඔබගේ ව්‍යාපාරයේ ප්‍රධාන වර්ගය කුමක්ද?",
        "type": "select",
        "options": ["food", "clothing", "salon", "vehicle_parts"],
    },
    "local_authority": {
        "fact": "local_authority",
        "question_en": "Which local municipal council or pradeshiya sabha governs your area?",
        "question_si": "ඔබගේ ප්‍රදේශය පාලනය වන පළාත් පාලන ආයතනය (මහනගර සභාව / නගර සභාව / ප්‍රාදේශීය සභාව) කුමක්ද?",
        "type": "select",
        "options": [
            "Colombo Municipal Council",
            "Dehiwala-Mount Lavinia Municipal Council",
            "Sri Jayawardenepura Kotte Municipal Council",
            "Moratuwa Municipal Council",
            "Other",
        ],
    },
    "has_physical_premises": {
        "fact": "has_physical_premises",
        "question_en": "Does your business operate from a fixed physical premises or commercial outlet?",
        "question_si": "ඔබගේ ව්‍යාපාරය ස්ථිර භෞතික ස්ථානයක හෝ වාණිජ පරිශ්‍රයක පවත්වාගෙන යන්නේද?",
        "type": "boolean",
        "options": [True, False],
    },
    "legal_form": {
        "fact": "legal_form",
        "question_en": "What is the registered legal structure of the business?",
        "question_si": "ව්‍යාපාරයේ ලියාපදිංචි නීතිමය ස්වරූපය කුමක්ද?",
        "type": "select",
        "options": ["sole_proprietorship", "partnership", "private_limited", "other"],
    },
    "number_of_employees": {
        "fact": "number_of_employees",
        "question_en": "How many permanent or contractual employees are employed?",
        "question_si": "ව්‍යාපාරයේ සේවය කරන සේවකයින් ගණන කීයද?",
        "type": "number",
        "options": [],
    },
    "handles_food": {
        "fact": "handles_food",
        "question_en": "Does the business prepare, handle, store, or sell food items to the public?",
        "question_si": "ව්‍යාපාරය ආහාර පිළියෙළ කිරීම, හැසිරවීම, ගබඩා කිරීම හෝ විකිණීම සිදු කරන්නේද?",
        "type": "boolean",
        "options": [True, False],
    },
    "serves_cooked_food": {
        "fact": "serves_cooked_food",
        "question_en": "Do you serve cooked or hot meals for direct customer consumption on the premises?",
        "question_si": "පාරිභෝගිකයින් සඳහා පිසූ හෝ උණුසුම් ආහාර පිළිගන්වන්නේද?",
        "type": "boolean",
        "options": [True, False],
    },
    "sells_alcohol": {
        "fact": "sells_alcohol",
        "question_en": "Does or will the premises store, dispense, or retail alcoholic beverages?",
        "question_si": "පරිශ්‍රය තුළ මත්පැන් ගබඩා කිරීම හෝ අලෙවි කිරීම සිදු කරන්නේද?",
        "type": "boolean",
        "options": [True, False],
    },
    "uses_chemicals_or_cosmetics": {
        "fact": "uses_chemicals_or_cosmetics",
        "question_en": "Does the salon use chemical cosmetics, hair coloring/perming solutions, or skin treatment agents?",
        "question_si": "රූපලාවණ්‍යාගාරය රසායනික ද්‍රව්‍ය, හිසකෙස් සායම් හෝ සම ප්‍රතිකාර ද්‍රව්‍ය භාවිතා කරන්නේද?",
        "type": "boolean",
        "options": [True, False],
    },
    "handles_waste_oil_or_batteries": {
        "fact": "handles_waste_oil_or_batteries",
        "question_en": "Does the business store, dismantle, or generate waste engine oil or spent lead batteries?",
        "question_si": "ව්‍යාපාරය භාවිත කළ මෝටර් තෙල් හෝ බැටරි ගබඩා කිරීම හෝ හැසිරවීම කරන්නේද?",
        "type": "boolean",
        "options": [True, False],
    },
    "turnover_band": {
        "fact": "turnover_band",
        "question_en": "What is the projected annual business revenue / turnover tier?",
        "question_si": "ඇස්තමේන්තුගත වාර්ෂික පිරිවැටුම් මට්ටම කුමක්ද?",
        "type": "select",
        "options": ["under_1m", "1m_10m", "10m_50m", "over_50m"],
    },
    "is_manufacturing": {
        "fact": "is_manufacturing",
        "question_en": "Does the business engage in industrial production or workshop assembly?",
        "question_si": "ව්‍යාපාරය කාර්මික නිෂ්පාදනයක් හෝ භාණ්ඩ නිෂ්පාදනයක නිරත වන්නේද?",
        "type": "boolean",
        "options": [True, False],
    },
    "is_importing": {
        "fact": "is_importing",
        "question_en": "Does the business directly import goods, equipment, or products into Sri Lanka?",
        "question_si": "ව්‍යාපාරය ශ්‍රී ලංකාවට සෘජුවම භාණ්ඩ හෝ උපකරණ ආනයනය කරන්නේද?",
        "type": "boolean",
        "options": [True, False],
    },
}


def get_question_for_fact(fact_name: str) -> Dict[str, Any]:
    """Retrieve question definition for a given missing fact name."""
    if fact_name in FACT_QUESTION_MAP:
        return FACT_QUESTION_MAP[fact_name]
    # Fallback default for unmapped fact
    return {
        "fact": fact_name,
        "question_en": f"Please provide information regarding '{fact_name}'.",
        "question_si": f"කරුණාකර '{fact_name}' පිළිබඳ තොරතුරු සපයන්න.",
        "type": "text",
        "options": [],
    }


def generate_follow_up_questions(missing_facts: List[str]) -> List[Dict[str, Any]]:
    """
    Given a list of missing fact strings, produces a deduplicated, ordered list
    of structured follow-up questions.
    Deterministic: no LLM used.
    """
    seen = set()
    questions = []
    for f in missing_facts:
        if f not in seen:
            seen.add(f)
            questions.append(get_question_for_fact(f))
    return questions
