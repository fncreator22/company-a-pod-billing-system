from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone, date
import csv
from io import StringIO

from app.schemas.all_schemas import (
    PodReviewActionRequest,
    BillingQueueItem,
    DashboardMetricsResponse,
    PublicPodViewResponse
)
from app.services.pod_service import pod_service
from app.services.trip_service import trip_service

class BillingReviewService:
    def __init__(self):
        # In-memory billing records map: trip_id -> billing_record (guarantees uq_billing_records_trip)
        self._billing_records: Dict[UUID, Dict[str, Any]] = {
            # Pre-seed Scenario 1 verified delivery (TRP-66120) into billing queue
            UUID("c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"): {
                "id": UUID("d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"),
                "pod_id": UUID("d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a00"),
                "trip_id": UUID("c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"),
                "original_amount": 38500.0,
                "deduction_amount": 0.0,
                "final_billed_amount": 38500.0,
                "billing_status": "billing_ready",
                "exported_at": None,
                "export_reference": None
            }
        }

    def list_review_queue(self) -> List[Dict[str, Any]]:
        """
        Lists all PODs requiring executive review (needs_review or failed).
        """
        review_items = []
        for pod in pod_service._pods.values():
            if pod["verification_status"] in ("needs_review", "failed"):
                trip = trip_service._trips.get(pod["trip_id"])
                verifications = pod_service._verifications.get(pod["id"], [])
                latest_verif = verifications[-1] if verifications else {}

                review_items.append({
                    "pod": pod,
                    "trip": trip,
                    "latest_verification": latest_verif
                })
        return review_items

    def save_review_decision(
        self,
        pod_id: UUID,
        request: PodReviewActionRequest,
        reviewer_id: UUID
    ) -> Dict[str, Any]:
        """
        Processes human reviewer decision (approved, request_retake, rejected).
        Applies financial shortage adjustments without overwriting original AI extraction.
        """
        pod = pod_service._pods.get(pod_id)
        if not pod:
            raise KeyError("POD not found")

        trip_id = pod["trip_id"]
        trip = trip_service._trips.get(trip_id)
        if not trip:
            raise KeyError("Trip not found")

        # Update POD metadata
        pod["reviewer_id"] = reviewer_id
        pod["reviewed_at"] = datetime.now(timezone.utc)
        pod["review_notes"] = request.review_notes

        if request.decision == "approved":
            pod["verification_status"] = "approved"
            original_amt = trip["trip_amount"]
            deduction = request.deduction_amount or 0.0
            final_amt = request.adjusted_billing_amount if request.adjusted_billing_amount is not None else (original_amt - deduction)

            pod["corrected_data"] = {
                "delivered_quantity": request.corrected_quantity,
                "deduction_amount": deduction,
                "adjusted_billing_amount": final_amt
            }

            # Insert or update billing_records (enforcing 1:1 on trip_id)
            self._billing_records[trip_id] = {
                "id": uuid4(),
                "pod_id": pod_id,
                "trip_id": trip_id,
                "original_amount": original_amt,
                "deduction_amount": deduction,
                "final_billed_amount": final_amt,
                "billing_status": "billing_ready",
                "exported_at": None,
                "export_reference": None
            }

        elif request.decision == "request_retake":
            if pod["retake_count"] >= 2:
                raise ValueError("Maximum retake limit (2) already exhausted for this POD.")
            pod["verification_status"] = "retake_requested"

        elif request.decision == "rejected":
            pod["verification_status"] = "rejected"

        return pod

    def get_billing_queue(self) -> List[BillingQueueItem]:
        items = []
        for b in self._billing_records.values():
            if b["billing_status"] in ("billing_ready", "exported"):
                trip = trip_service._trips.get(b["trip_id"], {})
                pod = pod_service._pods.get(b["pod_id"], {})
                verif = pod_service._verifications.get(b["pod_id"], [{}])[-1] if b["pod_id"] in pod_service._verifications else {}
                extracted = verif.get("extracted_data", {})

                items.append(BillingQueueItem(
                    pod_id=b["pod_id"],
                    trip_id=b["trip_id"],
                    trip_number=trip.get("trip_number", "UNKNOWN"),
                    customer_name=trip.get("customer_name", "UNKNOWN"),
                    vehicle_number=trip.get("vehicle_number", "UNKNOWN"),
                    vehicle_type=trip.get("vehicle_type", "company"),
                    destination=trip.get("destination", "UNKNOWN"),
                    goods_description=trip.get("goods_description", "UNKNOWN"),
                    lr_number=extracted.get("lr_number") or trip.get("expected_lr_number"),
                    delivered_quantity=pod.get("corrected_data", {}).get("delivered_quantity") if pod.get("corrected_data") else extracted.get("delivered_quantity"),
                    quantity_unit=extracted.get("quantity_unit") or trip.get("quantity_unit", "units"),
                    original_amount=b["original_amount"],
                    deduction_amount=b["deduction_amount"],
                    final_billed_amount=b["final_billed_amount"],
                    billing_status=b["billing_status"]
                ))
        return items

    def export_tally_csv(self) -> str:
        """
        Exports billing-ready items in Tally-compatible format:
        Trip Number,Customer Name,Vehicle Number,Vehicle Type,Destination,Goods Description,Billed Amount,LR Number,Delivered Quantity,Unit,Discrepancy Remarks,Delivery Date,Approved By
        """
        items = self.get_billing_queue()
        output = StringIO()
        writer = csv.writer(output)
        
        # Headers
        writer.writerow([
            "Trip Number", "Customer Name", "Vehicle Number", "Vehicle Type",
            "Destination", "Goods Description", "Billed Amount", "LR Number",
            "Delivered Quantity", "Unit", "Discrepancy Remarks", "Delivery Date", "Approved By"
        ])

        export_ref = f"EXP-{int(datetime.now(timezone.utc).timestamp())}"
        for item in items:
            writer.writerow([
                item.trip_number,
                item.customer_name,
                item.vehicle_number,
                item.vehicle_type,
                item.destination,
                item.goods_description,
                f"{item.final_billed_amount:.2f}",
                item.lr_number or "N/A",
                item.delivered_quantity if item.delivered_quantity is not None else "N/A",
                item.quantity_unit or "units",
                f"Deduction: INR {item.deduction_amount:.2f}" if item.deduction_amount > 0 else "None",
                str(date.today()),
                "Billing Executive"
            ])
            # Mark exported
            if item.trip_id in self._billing_records:
                self._billing_records[item.trip_id]["billing_status"] = "exported"
                self._billing_records[item.trip_id]["exported_at"] = datetime.now(timezone.utc)
                self._billing_records[item.trip_id]["export_reference"] = export_ref

        return output.getvalue()

    def get_dashboard_metrics(self) -> DashboardMetricsResponse:
        total = len(trip_service._trips)
        submitted = len(pod_service._pods)
        needs_review = sum(1 for p in pod_service._pods.values() if p["verification_status"] in ("needs_review", "failed"))
        retake_requested = sum(1 for p in pod_service._pods.values() if p["verification_status"] == "retake_requested")
        billing_ready = sum(1 for b in self._billing_records.values() if b["billing_status"] == "billing_ready")
        exported_count = sum(1 for b in self._billing_records.values() if b["billing_status"] == "exported")
        pending = max(0, total - submitted)

        return DashboardMetricsResponse(
            total_trips=total,
            pods_submitted=submitted,
            pods_pending=pending,
            needs_review=needs_review,
            retake_requested=retake_requested,
            billing_ready=billing_ready,
            exported_count=exported_count
        )

billing_service = BillingReviewService()
