/**
 * UOM codes are user-facing initials (KG, PCS, LTR). Clients may type them in
 * any case; entities normalise to uppercase before validating. The hyphen is
 * allowed so auto-generated codes (UOM-001) stay valid when edited.
 */
export const UOM_CODE_PATTERN = /^[A-Z][A-Z0-9_-]{0,19}$/;
