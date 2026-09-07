import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-Memory Data Store for REST API Endpoints
let properties: any[] = [
  {
    id: 'prop-1',
    name: 'Thompson Residence',
    address: '142 Yorkville Avenue',
    city: 'Toronto',
    province: 'ON',
    postalCode: 'M5R 1C2',
    propertyType: 'Single Family Home',
    clientName: 'Michael Thompson',
    clientEmail: 'm.thompson@example.ca',
    clientPhone: '+1 (416) 555-0192',
    imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    activeProjectsCount: 1,
    completedProjectsCount: 3
  },
  {
    id: 'prop-2',
    name: 'Williams Family Home',
    address: '88 Forest Hill Road',
    city: 'Toronto',
    province: 'ON',
    postalCode: 'M4V 2L7',
    propertyType: 'Single Family Home',
    clientName: 'Sarah Williams',
    clientEmail: 's.williams@example.ca',
    clientPhone: '+1 (416) 555-0184',
    imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    activeProjectsCount: 0,
    completedProjectsCount: 5
  },
  {
    id: 'prop-3',
    name: 'Anderson Property',
    address: '320 Bay Street, Suite 1400',
    city: 'Toronto',
    province: 'ON',
    postalCode: 'M5H 4A6',
    propertyType: 'Condo / Apartment',
    clientName: 'David Anderson',
    clientEmail: 'd.anderson@example.ca',
    clientPhone: '+1 (416) 555-0137',
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
    activeProjectsCount: 1,
    completedProjectsCount: 2
  }
];

let requests: any[] = [
  {
    id: 'req-101',
    referenceNumber: 'REQ-2026-8941',
    propertyId: 'prop-1',
    propertyName: 'Thompson Residence',
    propertyAddress: '142 Yorkville Avenue, Toronto, ON',
    clientName: 'Michael Thompson',
    serviceCategory: 'Plumbing',
    description: 'Leaking kitchen and bathroom taps causing water dripping under sink.',
    preferredDate: '2026-08-16',
    additionalNotes: 'Please call 15 minutes before arrival. Gate code is #4829.',
    photoUrls: ['https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80'],
    status: 'Approved',
    createdAt: '2026-08-13T09:00:00Z'
  },
  {
    id: 'req-102',
    referenceNumber: 'REQ-2026-9012',
    propertyId: 'prop-3',
    propertyName: 'Anderson Property',
    propertyAddress: '320 Bay Street, Suite 1400, Toronto, ON',
    clientName: 'David Anderson',
    serviceCategory: 'Electrical',
    description: 'Living room light switches tripping circuit breaker intermittently.',
    preferredDate: '2026-08-19',
    additionalNotes: 'Concierge desk has keys.',
    photoUrls: [],
    status: 'Awaiting Review',
    createdAt: '2026-08-13T10:15:00Z'
  }
];

let workers: any[] = [
  {
    id: 'worker-1',
    name: 'Michael Carter',
    roleTitle: 'Senior Plumbing Technician',
    phone: '+1 (416) 555-0199',
    email: 'm.carter@apexcare-demo.ca',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
    status: 'On Job',
    activeJobId: 'proj-501'
  },
  {
    id: 'worker-2',
    name: 'Daniel Wilson',
    roleTitle: 'Electrical & HVAC Specialist',
    phone: '+1 (416) 555-0188',
    email: 'd.wilson@apexcare-demo.ca',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    status: 'Available'
  },
  {
    id: 'worker-3',
    name: 'James Brown',
    roleTitle: 'General Repairs & Carpentry',
    phone: '+1 (416) 555-0144',
    email: 'j.brown@apexcare-demo.ca',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    status: 'Available'
  }
];

let projects: any[] = [
  {
    id: 'proj-501',
    title: 'Thompson Residence — Plumbing Repair',
    referenceNumber: 'PRJ-2026-7821',
    propertyId: 'prop-1',
    propertyName: 'Thompson Residence',
    propertyAddress: '142 Yorkville Avenue, Toronto, ON M5R 1C2',
    clientName: 'Michael Thompson',
    serviceCategory: 'Plumbing',
    status: 'In Progress',
    priority: 'High',
    workerId: 'worker-1',
    workerName: 'Michael Carter',
    workerPhone: '+1 (416) 555-0199',
    workerAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
    clientRequestSummary: 'Client reported leaking kitchen and bathroom taps causing water dripping under sink.',
    adminObservations: 'Kitchen cartridge appears damaged. Requires cartridge replacement and seal inspection.',
    additionalIssuesDiscovered: 'Bathroom faucet washer worn out; recommended full cartridge swap to prevent future leak.',
    scheduledDate: '2026-08-16',
    expectedCompletionDate: '2026-08-18',
    latitude: 43.6702,
    longitude: -79.3897,
    tasks: [
      { id: 'task-1', title: 'Inspect kitchen tap & connections', isCompleted: true, completedAt: '2026-08-16 10:45 AM' },
      { id: 'task-2', title: 'Inspect bathroom tap', isCompleted: true, completedAt: '2026-08-16 11:10 AM' },
      { id: 'task-3', title: 'Replace kitchen tap cartridge', isCompleted: true, completedAt: '2026-08-17 02:30 PM' },
      { id: 'task-4', title: 'Replace bathroom faucet cartridge', isCompleted: false },
      { id: 'task-5', title: 'Test water pressure & verify no leaks', isCompleted: false }
    ],
    photos: [
      {
        id: 'photo-1',
        url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80',
        category: 'Before',
        description: 'Kitchen Tap — Initial Inspection showing water corrosion around cartridge seal.',
        uploadedBy: 'Michael Carter (Technician)',
        timestamp: 'Aug 16, 2026 — 10:42 AM'
      },
      {
        id: 'photo-2',
        url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
        category: 'During',
        description: 'Disassembled cartridge housing during component replacement under sink.',
        uploadedBy: 'Michael Carter (Technician)',
        timestamp: 'Aug 17, 2026 — 01:20 PM'
      },
      {
        id: 'photo-3',
        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
        category: 'After',
        description: 'Kitchen Tap — High-arc chrome faucet successfully installed & pressure tested.',
        uploadedBy: 'Michael Carter (Technician)',
        timestamp: 'Aug 17, 2026 — 03:45 PM'
      }
    ],
    timeline: [
      {
        id: 'time-1',
        date: 'August 13, 2026',
        time: '09:00 AM',
        title: 'Service Request Created',
        description: 'Client reported leaking kitchen and bathroom taps via online portal.',
        authorName: 'Michael Thompson',
        authorRole: 'Client',
        iconType: 'request'
      },
      {
        id: 'time-2',
        date: 'August 14, 2026',
        time: '10:15 AM',
        title: 'Project Created & Reviewed',
        description: 'Service request reviewed by dispatch and converted into an active maintenance project.',
        authorName: 'ApexCare Dispatch',
        authorRole: 'Company Admin',
        iconType: 'project'
      },
      {
        id: 'time-3',
        date: 'August 15, 2026',
        time: '08:30 AM',
        title: 'Worker Assigned',
        description: 'Senior Technician Michael Carter assigned to lead property repairs.',
        authorName: 'ApexCare Admin',
        authorRole: 'Company Admin',
        iconType: 'worker'
      }
    ]
  }
];

// Health Check Endpoint
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'ApexCare Property Maintenance API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production'
  });
});

// Properties Endpoints
app.get('/api/v1/properties', (_req: Request, res: Response) => {
  res.json({ success: true, data: properties });
});

// Service Requests Endpoints
app.get('/api/v1/requests', (_req: Request, res: Response) => {
  res.json({ success: true, data: requests });
});

app.post('/api/v1/requests', (req: Request, res: Response) => {
  const { propertyId, propertyName, propertyAddress, clientName, serviceCategory, description, preferredDate, additionalNotes, photoUrls } = req.body;
  
  const refNum = `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const newRequest = {
    id: `req-${Date.now()}`,
    referenceNumber: refNum,
    propertyId: propertyId || 'prop-1',
    propertyName: propertyName || 'Thompson Residence',
    propertyAddress: propertyAddress || '142 Yorkville Avenue, Toronto, ON',
    clientName: clientName || 'Michael Thompson',
    serviceCategory: serviceCategory || 'General Maintenance',
    description: description || 'No description provided.',
    preferredDate: preferredDate || new Date().toISOString().split('T')[0],
    additionalNotes: additionalNotes || '',
    photoUrls: photoUrls || [],
    status: 'Awaiting Review',
    createdAt: new Date().toISOString()
  };

  requests.unshift(newRequest);
  res.status(201).json({ success: true, data: newRequest });
});

// Projects Endpoints
app.get('/api/v1/projects', (_req: Request, res: Response) => {
  res.json({ success: true, data: projects });
});

app.get('/api/v1/projects/:id', (req: Request, res: Response) => {
  const project = projects.find(p => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  res.json({ success: true, data: project });
});

// Admin Triage Endpoint
app.post('/api/v1/projects/triage', (req: Request, res: Response) => {
  const { requestId, workerId, priority, adminObservations, taskList } = req.body;
  const targetReq = requests.find(r => r.id === requestId);
  const worker = workers.find(w => w.id === workerId);

  if (!targetReq) {
    return res.status(404).json({ success: false, message: 'Service request not found' });
  }

  targetReq.status = 'Approved';
  const projRef = `PRJ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const newProjId = `proj-${Date.now()}`;

  const newTasks = (taskList || ['Initial inspection', 'Replace components', 'Test pressure']).map((t: string, idx: number) => ({
    id: `task-${Date.now()}-${idx}`,
    title: t,
    isCompleted: false
  }));

  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const newProject = {
    id: newProjId,
    title: `${targetReq.propertyName} — ${targetReq.serviceCategory} Maintenance`,
    referenceNumber: projRef,
    propertyId: targetReq.propertyId,
    propertyName: targetReq.propertyName,
    propertyAddress: targetReq.propertyAddress,
    clientName: targetReq.clientName,
    serviceCategory: targetReq.serviceCategory,
    status: 'Scheduled',
    priority: priority || 'Medium',
    workerId: worker?.id,
    workerName: worker?.name || 'Unassigned',
    workerPhone: worker?.phone || '',
    workerAvatar: worker?.avatarUrl || '',
    clientRequestSummary: targetReq.description,
    adminObservations: adminObservations || 'Initial triage completed.',
    additionalIssuesDiscovered: req.body.additionalIssuesDiscovered || '',
    scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    expectedCompletionDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    latitude: 43.6702,
    longitude: -79.3897,
    tasks: newTasks,
    photos: targetReq.photoUrls.map((url: string, i: number) => ({
      id: `photo-req-${i}`,
      url,
      category: 'Before',
      description: 'Client submitted request photo.',
      uploadedBy: targetReq.clientName,
      timestamp: `${formattedDate} — ${formattedTime}`
    })),
    timeline: [
      {
        id: `t-req-${Date.now()}`,
        date: formattedDate,
        time: formattedTime,
        title: 'Service Request Submitted',
        description: targetReq.description,
        authorName: targetReq.clientName,
        authorRole: 'Client',
        iconType: 'request'
      },
      {
        id: `t-proj-${Date.now()}`,
        date: formattedDate,
        time: formattedTime,
        title: 'Project Created & Assigned',
        description: `Converted to project (${projRef}). Assigned to ${worker?.name || 'Technician'}.`,
        authorName: 'ApexCare Admin',
        authorRole: 'Company Admin',
        iconType: 'project'
      }
    ]
  };

  projects.unshift(newProject);
  res.status(201).json({ success: true, data: newProject });
});

// Workers Endpoints (CRUD: Add & Remove Workers)
app.get('/api/v1/workers', (_req: Request, res: Response) => {
  res.json({ success: true, data: workers });
});

app.post('/api/v1/workers', (req: Request, res: Response) => {
  const { name, roleTitle, phone, email, avatarUrl } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }

  const newWorker = {
    id: `worker-${Date.now()}`,
    name,
    roleTitle: roleTitle || 'Field Maintenance Specialist',
    phone: phone || '+1 (416) 555-0100',
    email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@apexcare-demo.ca`,
    avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
    status: 'Available'
  };

  workers.push(newWorker);
  res.status(201).json({ success: true, data: newWorker });
});

app.delete('/api/v1/workers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLength = workers.length;
  workers = workers.filter(w => w.id !== id);

  if (workers.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Worker not found' });
  }

  res.json({ success: true, message: 'Worker removed successfully' });
});

app.listen(PORT, () => {
  console.log(`ApexCare Backend API running on port ${PORT}`);
});
