from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import date
from app.schemas.all_schemas import TripResponse, TripImportSummary

# In-memory storage seeded with the 3 canonical test trips for deterministic testing & local demo
INITIAL_TRIPS: List[Dict[str, Any]] = [
    {
        "id": UUID("c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"),
        "trip_number": "TRP-66120",
        "customer_name": "Company B",
        "goods_description": "Cement",
        "vehicle_number": "MH20 EL 4521",
        "destination": "Nagpur",
        "trip_amount": 38500.0,
        "vehicle_type": "company",
        "driver_id": UUID("b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"),
        "vendor_name": None,
        "expected_lr_number": "LR-9921",
        "invoice_number": "INV-5510",
        "expected_quantity": 500.0,
        "quantity_unit": "bags",
        "trip_date": date.today(),
        "pod_required": True,
        "pod_status": "verified"
    },
    {
        "id": UUID("c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02"),
        "trip_number": "TRP-66134",
        "customer_name": "Company C",
        "goods_description": "Steel",
        "vehicle_number": "MH20 GT 7718",
        "destination": "Pune",
        "trip_amount": 26000.0,
        "vehicle_type": "company",
        "driver_id": UUID("b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"),
        "vendor_name": None,
        "expected_lr_number": "LR-8841",
        "invoice_number": "INV-7740",
        "expected_quantity": 25.0,
        "quantity_unit": "tons",
        "trip_date": date.today(),
        "pod_required": True,
        "pod_status": "retake_requested"
    },
    {
        "id": UUID("c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03"),
        "trip_number": "TRP-66141",
        "customer_name": "Company D",
        "goods_description": "Packaged foods",
        "vehicle_number": "MH17 BY 3092",
        "destination": "Indore",
        "trip_amount": 41200.0,
        "vehicle_type": "hired",
        "driver_id": None, # Hired truck
        "vendor_name": "Patil Logistics",
        "expected_lr_number": "LR-7719",
        "invoice_number": "INV-9021",
        "expected_quantity": 120.0,
        "quantity_unit": "cartons",
        "trip_date": date.today(),
        "pod_required": True,
        "pod_status": "needs_review"
    }
]

class TripService:
    def __init__(self):
        # Local copy for mutations/imports
        self._trips: Dict[UUID, Dict[str, Any]] = {t["id"]: dict(t) for t in INITIAL_TRIPS}

    def list_trips(self, user_role: str, user_id: UUID) -> List[TripResponse]:
        results = []
        for t in self._trips.values():
            # If driver, only show assigned trips
            if user_role == "driver":
                if t.get("driver_id") == user_id:
                    results.append(TripResponse(**t))
            else:
                # Billing executive sees all trips
                results.append(TripResponse(**t))
        return results

    def get_trip(self, trip_id: UUID, user_role: str, user_id: UUID) -> Optional[TripResponse]:
        trip = self._trips.get(trip_id)
        if not trip:
            return None
        if user_role == "driver" and trip.get("driver_id") != user_id:
            return None
        return TripResponse(**trip)

    def import_csv(self, csv_content: str) -> TripImportSummary:
        import csv
        from io import StringIO
        
        f = StringIO(csv_content.strip())
        reader = csv.DictReader(f)
        imported = 0
        skipped = 0
        errors = []

        required_fields = ["trip_number", "customer_name", "goods_description", "vehicle_number", "destination", "trip_amount", "vehicle_type"]
        if not reader.fieldnames or not all(field in reader.fieldnames for field in required_fields):
            return TripImportSummary(
                imported_count=0,
                skipped_count=0,
                errors=[f"CSV missing mandatory columns: {', '.join(required_fields)}"]
            )

        for row_idx, row in enumerate(reader, start=1):
            trip_num = row.get("trip_number", "").strip()
            if not trip_num:
                errors.append(f"Row {row_idx}: Missing trip_number")
                continue

            # Check for duplicate trip_number
            if any(t["trip_number"] == trip_num for t in self._trips.values()):
                skipped += 1
                continue

            try:
                new_id = uuid4()
                trip_record = {
                    "id": new_id,
                    "trip_number": trip_num,
                    "customer_name": row["customer_name"].strip(),
                    "goods_description": row["goods_description"].strip(),
                    "vehicle_number": row["vehicle_number"].strip(),
                    "destination": row["destination"].strip(),
                    "trip_amount": float(row["trip_amount"]),
                    "vehicle_type": row["vehicle_type"].strip().lower(),
                    "driver_id": UUID(row["driver_id"].strip()) if row.get("driver_id") and row["driver_id"].strip() else None,
                    "vendor_name": row.get("vendor_name", "").strip() or None,
                    "expected_lr_number": row.get("expected_lr_number", "").strip() or None,
                    "invoice_number": row.get("invoice_number", "").strip() or None,
                    "expected_quantity": float(row["expected_quantity"]) if row.get("expected_quantity") and row["expected_quantity"].strip() else None,
                    "quantity_unit": row.get("quantity_unit", "units").strip() or "units",
                    "trip_date": date.today(),
                    "pod_required": True,
                    "pod_status": "pending"
                }
                self._trips[new_id] = trip_record
                imported += 1
            except Exception as e:
                errors.append(f"Row {row_idx} ({trip_num}): {str(e)}")

        return TripImportSummary(
            imported_count=imported,
            skipped_count=skipped,
            errors=errors
        )

trip_service = TripService()
