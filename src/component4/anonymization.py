"""
Component 4: Anonymization and Privacy Safeguard Service
Strictly anonymizes sensitive entity names, personal names, addresses,
tax identification numbers (TINs), bank accounts, and customs reference numbers.
Enforces zero PII exposure across all derived datasets, graph files, and reports.
"""

import re
import hashlib
from typing import Dict, Any, List, Optional, Set, Tuple


# Known entity registry mapping raw identifiable entities to canonical anonymized IDs
# and synthetic privacy-preserving metadata (role, country).
DATASET_07_ENTITY_REGISTRY: Dict[str, Dict[str, str]] = {
    "TYPEFI_AU": {
        "anonymized_id": "NODE_ENT_D07_01",
        "entity_type": "supplier_corporate",
        "jurisdiction": "AU",
        "description": "Software services provider (Parent entity)",
    },
    "TYPEFI_LK": {
        "anonymized_id": "NODE_ENT_D07_02",
        "entity_type": "client_subsidiary",
        "jurisdiction": "LK",
        "description": "Software development subsidiary",
    },
}

DATASET_06_ENTITY_REGISTRY: Dict[str, Dict[str, str]] = {
    # Primary Exporter
    "STARFLORA_LK": {
        "anonymized_id": "NODE_ENT_D06_EXP_01",
        "entity_type": "agricultural_exporter",
        "jurisdiction": "LK",
        "description": "Commercial horticulture / foliage exporter",
    },
    # Customs House Agents / Declarants
    "HUB_LANKA_CHA": {
        "anonymized_id": "NODE_ENT_D06_DEC_01",
        "entity_type": "customs_declarant_agent",
        "jurisdiction": "LK",
        "description": "Licensed customs house broker / freight forwarder",
    },
    "MSA_AIR_CHA": {
        "anonymized_id": "NODE_ENT_D06_DEC_02",
        "entity_type": "customs_declarant_agent",
        "jurisdiction": "LK",
        "description": "Licensed customs house broker / air cargo agent",
    },
    # Consignees / International Buyers
    "BLACK_TULIP_UAE": {
        "anonymized_id": "NODE_ENT_D06_CON_01",
        "entity_type": "international_buyer",
        "jurisdiction": "AE",
        "description": "Wholesale floral distributor (Middle East)",
    },
    "STARFLORA_HOLLAND_NL": {
        "anonymized_id": "NODE_ENT_D06_CON_02",
        "entity_type": "international_buyer",
        "jurisdiction": "NL",
        "description": "Wholesale floral distributor (Europe / Netherlands)",
    },
    "AL_MAHAMADI_SA": {
        "anonymized_id": "NODE_ENT_D06_CON_03",
        "entity_type": "international_buyer",
        "jurisdiction": "SA",
        "description": "Trading establishment (Saudi Arabia)",
    },
    "OZ_IMPORT_NL": {
        "anonymized_id": "NODE_ENT_D06_CON_04",
        "entity_type": "international_buyer",
        "jurisdiction": "NL",
        "description": "Horticultural importer / distributor (Europe)",
    },
    "FLORA_FRESH_US": {
        "anonymized_id": "NODE_ENT_D06_CON_05",
        "entity_type": "international_buyer",
        "jurisdiction": "US",
        "description": "Fresh floral importer / wholesale partner",
    },
    "ADOMEX_NL": {
        "anonymized_id": "NODE_ENT_D06_CON_06",
        "entity_type": "international_buyer",
        "jurisdiction": "NL",
        "description": "Cut greens import specialist (Netherlands)",
    },
    "BLOOMS_INTL": {
        "anonymized_id": "NODE_ENT_D06_CON_07",
        "entity_type": "international_buyer",
        "jurisdiction": "OTHER",
        "description": "International floral trading partner",
    },
    # Logistics / Clearing Partners
    "IP_HANDLERS_NL": {
        "anonymized_id": "NODE_ENT_D06_LOG_01",
        "entity_type": "logistics_handling_agent",
        "jurisdiction": "NL",
        "description": "Perishables logistics handling agent (Schiphol / Aalsmeer)",
    },
}

# Known sensitive patterns that MUST NOT appear in derived outputs
PII_FORBIDDEN_PATTERNS = [
    r"Typefi",
    r"Chandi\s+Perera",
    r"Balapokuna",
    r"Maroochydore",
    r"Starflora",
    r"Star\s+Flora",
    r"Black\s+Tulip",
    r"Hub\s+Lanka",
    r"M\s+S\s+A\s+Air",
    r"Mahamadi",
    r"Adomex",
    r"1146888607000",
    r"1143035692525",
    r"1009065702525",
    r"100540001151",
    r"106480012456",
    r"10648001244[0-9]",
    r"starflora260709@gmail\.com",
    r"00\s*94\s*77\s*37\s*97\s*305",
]


class AnonymizationManager:
    """
    Manages deterministic, privacy-preserving entity and document anonymization.
    """

    def __init__(self):
        self._d07_registry = DATASET_07_ENTITY_REGISTRY
        self._d06_registry = DATASET_06_ENTITY_REGISTRY

    def resolve_dataset07_party(self, raw_text: str, is_sender: bool = True) -> Dict[str, str]:
        """Resolves party in Dataset 07 to anonymized entity descriptor."""
        text_upper = raw_text.upper()
        if "PTY LTD" in text_upper or "AUSTRALIA" in text_upper or (is_sender and "TYPEFI" in text_upper):
            meta = self._d07_registry["TYPEFI_AU"]
            return {
                "entity_id": meta["anonymized_id"],
                "role": "issuer_supplier",
                "jurisdiction": meta["jurisdiction"],
                "entity_type": meta["entity_type"],
            }
        else:
            meta = self._d07_registry["TYPEFI_LK"]
            return {
                "entity_id": meta["anonymized_id"],
                "role": "recipient_client",
                "jurisdiction": meta["jurisdiction"],
                "entity_type": meta["entity_type"],
            }

    def resolve_dataset06_exporter(self, raw_text: str = "") -> Dict[str, str]:
        """Resolves primary exporter in Dataset 06."""
        meta = self._d06_registry["STARFLORA_LK"]
        return {
            "entity_id": meta["anonymized_id"],
            "role": "exporter",
            "jurisdiction": meta["jurisdiction"],
            "entity_type": meta["entity_type"],
        }

    def resolve_dataset06_declarant(self, raw_text: str) -> Optional[Dict[str, str]]:
        """Resolves customs house agent in Dataset 06."""
        text_upper = raw_text.upper()
        if "HUB" in text_upper or "1143035692525" in text_upper:
            meta = self._d06_registry["HUB_LANKA_CHA"]
            return {
                "entity_id": meta["anonymized_id"],
                "role": "customs_declarant",
                "jurisdiction": meta["jurisdiction"],
                "entity_type": meta["entity_type"],
            }
        elif "MSA" in text_upper or "M S A" in text_upper or "1009065702525" in text_upper:
            meta = self._d06_registry["MSA_AIR_CHA"]
            return {
                "entity_id": meta["anonymized_id"],
                "role": "customs_declarant",
                "jurisdiction": meta["jurisdiction"],
                "entity_type": meta["entity_type"],
            }
        return None

    def resolve_dataset06_consignee(self, raw_text: str, filename: str = "") -> Dict[str, str]:
        """Resolves international consignee based on document text or filename customer code."""
        combined = (raw_text + " " + filename).upper()
        if "BLACK TULIP" in combined or "BTFL" in combined:
            meta = self._d06_registry["BLACK_TULIP_UAE"]
        elif "HOLLAND" in combined or "SFH" in combined or "VABIX" in combined:
            meta = self._d06_registry["STARFLORA_HOLLAND_NL"]
        elif "MAHAMADI" in combined or "OBAID" in combined or " JD" in combined or combined.endswith("JD.PDF"):
            meta = self._d06_registry["AL_MAHAMADI_SA"]
        elif "OZ IMPORT" in combined or "COLORIGINZ" in combined or " OZ" in combined or "OZ (" in combined:
            meta = self._d06_registry["OZ_IMPORT_NL"]
        elif "FLORA FRESH" in combined or "FFS" in combined:
            meta = self._d06_registry["FLORA_FRESH_US"]
        elif "ADOMEX" in combined:
            meta = self._d06_registry["ADOMEX_NL"]
        elif "BLOOM" in combined:
            meta = self._d06_registry["BLOOMS_INTL"]
        else:
            meta = self._d06_registry["BLACK_TULIP_UAE"]  # Safe default to known buyer category

        return {
            "entity_id": meta["anonymized_id"],
            "role": "consignee_buyer",
            "jurisdiction": meta["jurisdiction"],
            "entity_type": meta["entity_type"],
        }

    def anonymize_document_id(self, dataset_prefix: str, index: int) -> str:
        """Assigns uniform privacy-preserving document identifier."""
        return f"DOC_{dataset_prefix}_{index:03d}"

    @staticmethod
    def verify_no_pii(text_or_obj: Any) -> Tuple[bool, List[str]]:
        """
        Scans a string, dictionary, list, or text dump for forbidden PII / sensitive tokens.
        Returns (is_clean, violations).
        """
        serialized = str(text_or_obj)
        violations = []
        for pat in PII_FORBIDDEN_PATTERNS:
            matches = re.findall(pat, serialized, flags=re.IGNORECASE)
            if matches:
                violations.append(f"Forbidden match found for pattern '{pat}': {set(matches)}")
        return len(violations) == 0, violations

    @staticmethod
    def assert_no_pii(text_or_obj: Any) -> None:
        """Raises AssertionError if any forbidden PII token is found."""
        is_clean, violations = AnonymizationManager.verify_no_pii(text_or_obj)
        if not is_clean:
            raise AssertionError(f"PII Violation Detected in Output Artifact: {violations}")
