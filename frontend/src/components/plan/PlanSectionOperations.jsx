import React from 'react';
import { 
  Users, 
  Wrench, 
  Truck, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export default function PlanSectionOperations({ profile, operationalPlan = {} }) {
  const businessInput = profile?.business_input || {};
  
  const availStaff = businessInput.available_staff_count ?? 1;
  const reqStaff = businessInput.required_staff_count ?? availStaff;
  const isStaffBalanced = availStaff >= reqStaff;

  const equipScore = businessInput.available_equipment_score ?? 3;
  const reqEquipScore = businessInput.required_equipment_score ?? equipScore;
  const isEquipReady = equipScore >= reqEquipScore;

  const supplierScore = businessInput.supplier_availability_score ?? 3;
  const district = businessInput.district || 'Western Province';

  return (
    <div className="bp-section" id="section-operations">
      
      {/* Section Header */}
      <div className="bp-section-header">
        <span className="bp-section-num">02</span>
        <div className="bp-section-heading-text">
          <h2 className="bp-section-title">
            <Users size={18} style={{ color: '#818cf8' }} />
            Operational & Resource Setup
          </h2>
          <div className="bp-section-subtitle">
            Human capital staffing, machinery & equipment readiness, and local supply chain logistics
          </div>
        </div>
      </div>

      {/* Operational Grid */}
      <div className="bp-ops-grid">
        
        {/* Tile 1: Staffing Capacity */}
        <div className="bp-ops-tile">
          <div className="bp-ops-tile-title">
            <Users size={14} style={{ color: '#818cf8' }} />
            <span>Staffing Capacity</span>
          </div>
          <div className="bp-ops-tile-val" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{availStaff} Available / {reqStaff} Required</span>
            {isStaffBalanced ? (
              <CheckCircle2 size={16} style={{ color: '#34d399' }} />
            ) : (
              <AlertCircle size={16} style={{ color: '#f59e0b' }} />
            )}
          </div>
          <div className="bp-ops-tile-desc">
            {operationalPlan.staffing_requirements || (isStaffBalanced ? 'Staff capacity is adequately balanced for initial operations.' : 'Additional staff recruitment recommended prior to launch.')}
          </div>
        </div>

        {/* Tile 2: Equipment Readiness */}
        <div className="bp-ops-tile">
          <div className="bp-ops-tile-title">
            <Wrench size={14} style={{ color: '#38bdf8' }} />
            <span>Equipment Readiness</span>
          </div>
          <div className="bp-ops-tile-val" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Score: {equipScore}/5 vs Req: {reqEquipScore}/5</span>
            {isEquipReady ? (
              <CheckCircle2 size={16} style={{ color: '#34d399' }} />
            ) : (
              <AlertCircle size={16} style={{ color: '#f59e0b' }} />
            )}
          </div>
          <div className="bp-ops-tile-desc">
            {operationalPlan.equipment_readiness || (isEquipReady ? 'Equipment baseline meets standard operating requirements.' : 'Procurement of supplemental equipment required.')}
          </div>
        </div>

        {/* Tile 3: Supply Chain Logistics */}
        <div className="bp-ops-tile">
          <div className="bp-ops-tile-title">
            <Truck size={14} style={{ color: '#34d399' }} />
            <span>Supply Chain Network</span>
          </div>
          <div className="bp-ops-tile-val">
            <span>Availability: {supplierScore}/5</span>
          </div>
          <div className="bp-ops-tile-desc">
            {operationalPlan.supplier_logistics || `Connected to ${district} SME vendor supply network.`}
          </div>
        </div>

      </div>

    </div>
  );
}
