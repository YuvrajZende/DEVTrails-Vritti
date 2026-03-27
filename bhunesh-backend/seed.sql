-- ============================================================
-- Vritti Backend — Seed Data
-- 5 zones (real Indian cities) + 10 mock workers
-- ============================================================

-- Clear existing seed data
DELETE FROM payouts;
DELETE FROM claims;
DELETE FROM policies;
DELETE FROM disruption_events;
DELETE FROM workers;
DELETE FROM zones;

-- ===================== ZONES =====================
INSERT INTO zones (id, name, city, state, flood_history, avg_disruption_days, aqi_baseline, is_high_risk) VALUES
('VAD-04', 'Vadodara Zone 4',       'Vadodara',  'Gujarat',       true,  18, 120, true),
('MUM-07', 'Mumbai Andheri West',    'Mumbai',    'Maharashtra',   true,  25, 155, true),
('DEL-12', 'Delhi Dwarka Sector 12', 'Delhi',     'Delhi',         false, 12, 280, true),
('BLR-03', 'Bangalore Whitefield',   'Bangalore', 'Karnataka',     false,  8,  85, false),
('CHN-06', 'Chennai Tambaram',       'Chennai',   'Tamil Nadu',    true,  22, 105, true);

-- ===================== WORKERS =====================
INSERT INTO workers (id, phone, name, platform, partner_id, zone_id, language, device_fingerprint, upi_id, tenure_weeks, avg_weekly_earnings) VALUES
('w_0001', '9876543210', 'Raju Sharma',      'Amazon',   'AMZ-782451', 'VAD-04', 'hi', 'fp_abc101', 'raju@upi',      24, 3800),
('w_0002', '9876543211', 'Amit Patel',        'Flipkart', 'FLK-339182', 'VAD-04', 'gu', 'fp_abc102', 'amit.p@upi',    16, 4200),
('w_0003', '9876543212', 'Suresh Yadav',      'Meesho',   'MSH-551023', 'MUM-07', 'hi', 'fp_abc103', 'suresh.y@upi',  32, 4500),
('w_0004', '9876543213', 'Priya Nair',        'Amazon',   'AMZ-447891', 'MUM-07', 'mr', 'fp_abc104', 'priya.n@upi',   10, 3200),
('w_0005', '9876543214', 'Deepak Kumar',      'Flipkart', 'FLK-662134', 'DEL-12', 'hi', 'fp_abc105', 'deepak.k@upi',  40, 5100),
('w_0006', '9876543215', 'Anjali Verma',      'Amazon',   'AMZ-118765', 'DEL-12', 'hi', 'fp_abc106', 'anjali.v@upi',   6, 2900),
('w_0007', '9876543216', 'Karthik Reddy',     'Meesho',   'MSH-889023', 'BLR-03', 'te', 'fp_abc107', 'karthik.r@upi', 28, 4800),
('w_0008', '9876543217', 'Lakshmi Iyer',      'Flipkart', 'FLK-774512', 'BLR-03', 'ta', 'fp_abc108', 'lakshmi.i@upi', 14, 3600),
('w_0009', '9876543218', 'Muthu Krishnan',    'Amazon',   'AMZ-223467', 'CHN-06', 'ta', 'fp_abc109', 'muthu.k@upi',   20, 4100),
('w_0010', '9876543219', 'Selvi Murugan',     'Meesho',   'MSH-995341', 'CHN-06', 'ta', 'fp_abc110', 'selvi.m@upi',    4, 2800);
