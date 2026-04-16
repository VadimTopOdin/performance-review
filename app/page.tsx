"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Save,
  Plus,
  Trash2,
  Users,
  Briefcase,
  Star,
  X,
  FolderPlus,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Minus,
  Share2,
  Moon,
  Sun,
  Pencil,
} from "lucide-react";
import Image from "next/image";

type Level = "junior" | "mid" | "strong_mid" | "senior" | "lead";

type MetricCode = "delivery" | "quality" | "ownership" | "consulting";

type Project = {
  id: string;
  name: string;
};

type MetricScore = {
  level: Level;
  comment: string;
};

type SessionScores = Record<string, Record<MetricCode, MetricScore>>;

type Skill = {
  id: string;
  name: string;
};

type GrowthItem = {
  id: string;
  text: string;
};

type FeedbackItem = {
  id: string;
  projectId: string;
  respondentName: string;
  respondentRole: string;
  comfort: string;
  pull: string;
  trust: string;
  comment: string;
};

type ReviewSession = {
  id: string;
  dbId?: number;
  meetingNumber: string;
  meetingDate: string;
  overallLevel: Level;
  projects: Project[];
  scores: SessionScores;
  skills: Skill[];
  feedback: FeedbackItem[];
  growthAreas: GrowthItem[];
};

type EmployeeReviewBucket = {
  sessions: ReviewSession[];
  skills: Skill[];
};

type Employee = {
  id: string;
  name: string;
  grade: string;
};

const levelOptions: Level[] = ["junior", "mid", "strong_mid", "senior", "lead"];

const levelRank: Record<Level, number> = {
  junior: 1,
  mid: 2,
  strong_mid: 3,
  senior: 4,
  lead: 5,
};

const metrics: { code: MetricCode; name: string; hints: string[] }[] = [
  {
    code: "delivery",
    name: "Delivery",
    hints: ["Укладывается в сроки", "Не создаёт пожары / переделки", "Умеет оценивать"],
  },
  {
    code: "quality",
    name: "Quality",
    hints: ["Не делает явные костыли", "Не плодит баги / переделки", "Думает про будущее"],
  },
  {
    code: "ownership",
    name: "Ownership",
    hints: [
      "Берёт ответственность",
      "Не действует по принципу 'моя задача закончилась'",
      "Предлагает решения",
    ],
  },
  {
    code: "consulting",
    name: "Consulting skill",
    hints: [
      "Понимает бизнес-контекст",
      "Может спорить с заказчиком по делу",
      "Предлагает решения, а не просто реализует",
    ],
  },
];

const initialCuratorAccessMap: Record<string, string[]> = {};

const initialEmployees: Employee[] = [];

const initialCuratorOptions: { id: string; name: string }[] = [];

const initialAllProjectOptions: Project[] = [
  { id: "msb", name: "MSB" },
  { id: "rshb", name: "RSHB" },
  { id: "vtb", name: "VTB" },
  { id: "ifrs9", name: "IFRS9 Factory" },
  { id: "aml-core", name: "AML Core" },
  { id: "rtdm", name: "RTDM" },
];

const gradeOptions = [
  "Junior Analyst",
  "Middle Analyst",
  "Senior Analyst",
  "Lead Analyst",
  "Junior Developer",
  "Middle Developer",
  "Senior Developer",
  "Lead Developer",
  "Junior System Analyst",
  "Middle System Analyst",
  "Senior System Analyst",
  "Lead System Analyst",
  "Team Lead",
  "Architect",
  "QA Engineer",
  "BA / Consultant",
];

const getYear = (date: string) => (date ? String(date).slice(0, 4) : "");

const HEADER_CONTROL_CLASS =
  "border-slate-200 dark:border-slate-800 shadow-none ring-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-slate-200 dark:border-slate-800 data-[state=open]:ring-0 data-[state=open]:shadow-none";

const blurActiveElement = () => {
  if (typeof document === "undefined") return;
  const el = document.activeElement;
  if (el instanceof HTMLElement) {
    el.blur();
  }
};

const createEmptyMetricScores = (): Record<MetricCode, MetricScore> => {
  return metrics.reduce((acc, metric) => {
    acc[metric.code] = { level: "mid", comment: "" };
    return acc;
  }, {} as Record<MetricCode, MetricScore>);
};

const createProject = (id: string, name: string): Project => ({ id, name });

const createReviewSession = ({
  meetingNumber,
  meetingDate,
  overallLevel,
  projects,
  scores,
  skills,
  feedback,
}: {
  meetingNumber: string;
  meetingDate: string;
  overallLevel: Level;
  projects: Project[];
  scores: SessionScores;
  skills: Skill[];
  feedback: FeedbackItem[];
  growthAreas: GrowthItem[];
}): ReviewSession => ({
  id: `${meetingDate}-${meetingNumber}`,
  meetingNumber,
  meetingDate,
  overallLevel,
  projects,
  scores,
  skills,
  feedback,
  growthAreas,
});

const initialEmployeeReviewMap: Record<string, EmployeeReviewBucket> = {};

function DeltaBadge({ currentLevel, previousLevel, emptyLabel = false }: { currentLevel?: Level | null; previousLevel?: Level | null; emptyLabel?: boolean }) {
  if (!currentLevel) return null;

  if (!previousLevel) {
    return (
      <Badge variant="outline" className="gap-1 rounded-full text-xs">
        <Minus className="h-3 w-3" />
        {emptyLabel ? "Первая встреча" : ""}
      </Badge>
    );
  }

  const currentRank = levelRank[currentLevel] || 0;
  const previousRank = levelRank[previousLevel] || 0;

  if (currentRank > previousRank) {
    return (
      <Badge className="gap-1 rounded-full border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">
        <TrendingUp className="h-3 w-3" />
        {emptyLabel ? "Выше прошлой" : ""}
      </Badge>
    );
  }

  if (currentRank < previousRank) {
    return (
      <Badge className="gap-1 rounded-full border-0 bg-red-100 text-red-700 hover:bg-red-100 text-xs">
        <TrendingDown className="h-3 w-3" />
        {emptyLabel ? "Ниже прошлой" : ""}
      </Badge>
    );
  }

  return (
    <Badge className="gap-1 rounded-full border-0 bg-sky-100 text-sky-700 hover:bg-sky-100 text-xs">
      <Minus className="h-3 w-3" />
      {emptyLabel ? "Как прошлая" : ""}
    </Badge>
  );
}

function makeSessionId(meetingDate: string, meetingNumber: string) {
  return `${meetingDate}-${meetingNumber}`;
}

function slugifyProjectId(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return slug || `project-${Date.now()}`;
}

function sortSessions(a: ReviewSession, b: ReviewSession) {
  if (a.meetingDate !== b.meetingDate) {
    return a.meetingDate.localeCompare(b.meetingDate);
  }
  return Number(a.meetingNumber) - Number(b.meetingNumber);
}

type DbEmployee = {
  id: string;
  full_name: string;
  grade: string | null;
};

type DbCuratorAccess = {
  curator_id: string;
  employee_id: string;
};

type DbCurator = {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "curator" | null;
};

type DbProject = {
  id: string;
  name: string;
};

type DbReviewSession = {
  id: number;
  employee_id: string;
  meeting_number: number;
  meeting_date: string;
  overall_level: Level;
};

type DbSessionProject = {
  review_session_id: number;
  project_id: string;
};

type DbMetricScore = {
  review_session_id: number;
  project_id: string;
  metric_code: MetricCode;
  level: Level;
  comment: string | null;
};

type DbEmployeeSkill = {
  id: number;
  employee_id: string;
  skill_name: string;
};

type DbSkillCatalog = {
  id: number;
  name: string;
};

type DbGrowthArea = {
  id: number;
  review_session_id: number;
  text: string | null;
};

type DbFeedback = {
  id: number;
  review_session_id: number;
  project_id: string | null;
  respondent_name: string | null;
  respondent_role: string | null;
  comfort: string | null;
  pull: string | null;
  trust: string | null;
  comment: string | null;
};

type DbAccessRequest = {
  id: number;
  employee_id: string;
  requester_curator_id: string;
  target_curator_id: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type AccessRequest = {
  id: number;
  employeeId: string;
  requesterCuratorId: string;
  targetCuratorId: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

function emptyBucket(): EmployeeReviewBucket {
  return { sessions: [], skills: [] };
}


export default function PerformanceReviewUiMvp() {
  const handleYearChange = (value: string) => {
    setSelectedYear(value);
    requestAnimationFrame(() => blurActiveElement());
  };

  const handleMeetingChange = (value: string) => {
    setSelectedMeetingNumber(value);
    requestAnimationFrame(() => blurActiveElement());
  };

  const handleCreateMeeting = () => {
    if (!newMeetingDate) {
      setShowNewMeetingPicker((prev) => !prev);
      requestAnimationFrame(() => blurActiveElement());
      return;
    }

    createNewMeeting(newMeetingDate);
    requestAnimationFrame(() => blurActiveElement());
  };

  const handleOverallLevelChange = (value: Level) => {
    updateCurrentSession((session) => ({ ...session, overallLevel: value }));
    requestAnimationFrame(() => blurActiveElement());
  };

  const handleSave = async () => {
    await saveAllToDb();
    requestAnimationFrame(() => blurActiveElement());
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

    if (error) {
      console.error(error);
      alert("Не удалось войти через Google");
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      alert("Не удалось выйти");
    }
  };
  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<"admin" | "curator">("curator");
  const [showIntro, setShowIntro] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("1");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMeetingNumber, setSelectedMeetingNumber] = useState("2");
  const [allProjectOptions, setAllProjectOptions] = useState<Project[]>(initialAllProjectOptions);
  const [showCreateProjectForm, setShowCreateProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCode, setNewProjectCode] = useState("");
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [curatorOptions, setCuratorOptions] = useState<{ id: string; name: string }[]>(initialCuratorOptions);
  const [employeeReviewMap, setEmployeeReviewMap] = useState<Record<string, EmployeeReviewBucket>>(initialEmployeeReviewMap);
  const [curatorAccessMap, setCuratorAccessMap] = useState<Record<string, string[]>>(initialCuratorAccessMap);
  const [shareCuratorId, setShareCuratorId] = useState("u2");
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newProjectId, setNewProjectId] = useState("");
  const [showNewMeetingPicker, setShowNewMeetingPicker] = useState(false);
  const [newMeetingDate, setNewMeetingDate] = useState("");
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeGrade, setNewEmployeeGrade] = useState("");
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState(false);
  const [showEditEmployeeForm, setShowEditEmployeeForm] = useState(false);
  const [editEmployeeName, setEditEmployeeName] = useState("");
  const [editEmployeeGrade, setEditEmployeeGrade] = useState("");
  const [editingEmployee, setEditingEmployee] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [employeeListTab, setEmployeeListTab] = useState<"mine" | "all">("mine");
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [requestingEmployeeId, setRequestingEmployeeId] = useState<string | null>(null);
  const [approvingRequestId, setApprovingRequestId] = useState<number | null>(null);
  const [skillOptions, setSkillOptions] = useState<string[]>(["SQL", "Python", "SAS", "Power BI", "Databricks"]);
  const [newSkillOption, setNewSkillOption] = useState("");

  const currentUser = useMemo(() => ({
    id: currentUserId || "",
    name: currentUserName || authUser?.user_metadata?.full_name || authUser?.email || "",
    role: currentUserRole,
  }), [currentUserId, currentUserName, currentUserRole, authUser]);

  const selectedEmployee = useMemo(() => {
    return employees.find((employee) => employee.id === selectedEmployeeId) ?? employees[0];
  }, [selectedEmployeeId, employees]);

  const allowedIds = useMemo(() => {
    if (!currentUserId) return [];
    if (currentUserRole === "admin") return employees.map((employee) => employee.id);
    return curatorAccessMap[currentUserId] || [];
  }, [curatorAccessMap, currentUserId, currentUserRole, employees]);

  const filteredEmployees = useMemo(() => {
    const base = employees.filter((employee) => allowedIds.includes(employee.id));
    const q = search.trim().toLowerCase();

    if (!q) return base;

    return base.filter((employee) => {
      return employee.name.toLowerCase().includes(q) || employee.grade.toLowerCase().includes(q);
    });
  }, [allowedIds, search, employees]);

  const allEmployeesFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((employee) =>
      employee.name.toLowerCase().includes(q) || employee.grade.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const pendingAccessRequests = useMemo(
    () => accessRequests.filter((request) => request.status === "pending"),
    [accessRequests]
  );

  const hasAccessToEmployee = (employeeId: string) => allowedIds.includes(employeeId);

  const canApproveRequest = (employeeId: string) => currentUserRole === "admin" || hasAccessToEmployee(employeeId);

  const getPendingRequestForEmployee = (employeeId: string) =>
    pendingAccessRequests.find(
      (request) => request.employeeId === employeeId && request.requesterCuratorId === currentUser.id
    );


  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) {
        setAuthUser(data.user ?? null);
        setAuthLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setAuthUser(session?.user ?? null);
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedTheme = window.localStorage.getItem("anti-kpi-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("anti-kpi-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };


  useEffect(() => {
    const syncCurator = async () => {
      if (!authUser?.email) {
        setCurrentUserId(null);
        setCurrentUserName("");
        setCurrentUserRole("curator");
        return;
      }

      const displayName = authUser.user_metadata?.full_name || authUser.email;

      const { data: existing, error: selectError } = await supabase
        .from("curators")
        .select("id, name, role")
        .eq("email", authUser.email)
        .maybeSingle();

      if (selectError) {
        console.error(selectError);
        return;
      }

      if (existing) {
        setCurrentUserId(existing.id);
        setCurrentUserName(existing.name || displayName);
        setCurrentUserRole((existing.role as "admin" | "curator" | null) || "curator");
        return;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("curators")
        .insert({ email: authUser.email, name: displayName, role: "curator" })
        .select("id, name, role")
        .single();

      if (insertError) {
        console.error(insertError);
        return;
      }

      setCurrentUserId(inserted.id);
      setCurrentUserName(inserted.name || displayName);
      setCurrentUserRole((inserted.role as "admin" | "curator" | null) || "curator");
    };

    syncCurator();
  }, [authUser]);

useEffect(() => {
  const loadData = async () => {
    setLoading(true);

    const [
      employeesRes,
      curatorsRes,
      curatorAccessRes,
      projectsRes,
      sessionsRes,
      sessionProjectsRes,
      metricScoresRes,
      employeeSkillsRes,
      feedbackRes,
      accessRequestsRes,
      skillCatalogRes,
      growthAreasRes,
    ] = await Promise.all([
      supabase.from("employees").select("id, full_name, grade").order("id"),
      supabase.from("curators").select("id, email, name, role").order("name"),
      supabase.from("curator_access").select("curator_id, employee_id"),
      supabase.from("projects").select("id, name").order("name"),
      supabase
        .from("review_sessions")
        .select("id, employee_id, meeting_number, meeting_date, overall_level")
        .order("meeting_date")
        .order("meeting_number"),
      supabase.from("session_projects").select("review_session_id, project_id"),
      supabase
        .from("session_metric_scores")
        .select("review_session_id, project_id, metric_code, level, comment"),
      supabase.from("employee_skills").select("id, employee_id, skill_name"),
      supabase
        .from("session_feedback")
        .select(
          "id, review_session_id, project_id, respondent_name, respondent_role, comfort, pull, trust, comment"
        ),
      supabase
        .from("access_requests")
        .select("id, employee_id, requester_curator_id, target_curator_id, status, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("skill_catalog").select("id, name").order("name"),
      supabase.from("growth_areas").select("id, review_session_id, text").order("id"),
    ]);

    const errors = [
      employeesRes.error,
      curatorsRes.error,
      curatorAccessRes.error,
      projectsRes.error,
      sessionsRes.error,
      sessionProjectsRes.error,
      metricScoresRes.error,
      employeeSkillsRes.error,
      feedbackRes.error,
      accessRequestsRes.error,
      skillCatalogRes.error,
      growthAreasRes.error,
    ].filter(Boolean);

    if (errors.length) {
      console.error(errors);
      setLoading(false);
      return;
    }

    const nextEmployees: Employee[] = ((employeesRes.data as DbEmployee[]) || []).map((employee) => ({
      id: employee.id,
      name: employee.full_name,
      grade: employee.grade || "",
    }));

    const nextCuratorOptions = ((curatorsRes.data as DbCurator[]) || []).map((curator) => ({
      id: curator.id,
      name: `${curator.name || curator.email}${curator.role === "admin" ? " (admin)" : ""}`,
    }));

    const nextCuratorAccessMap: Record<string, string[]> = {};
    ((curatorAccessRes.data as DbCuratorAccess[]) || []).forEach((row) => {
      if (!nextCuratorAccessMap[row.curator_id]) nextCuratorAccessMap[row.curator_id] = [];
      nextCuratorAccessMap[row.curator_id].push(row.employee_id);
    });

    const nextProjects = ((projectsRes.data as DbProject[]) || []).map((project) => ({
      id: project.id,
      name: project.name,
    }));

    const projectMap = new Map(nextProjects.map((project) => [project.id, project]));
    const bucketMap: Record<string, EmployeeReviewBucket> = {};
    nextEmployees.forEach((employee) => {
      bucketMap[employee.id] = emptyBucket();
    });

    const sessionMap = new Map<number, ReviewSession>();
    ((sessionsRes.data as DbReviewSession[]) || []).forEach((row) => {
      const session: ReviewSession = {
        id: makeSessionId(row.meeting_date, String(row.meeting_number)),
        dbId: row.id,
        meetingNumber: String(row.meeting_number),
        meetingDate: row.meeting_date,
        overallLevel: row.overall_level,
        projects: [],
        scores: {},
        skills: [],
        feedback: [],
        growthAreas: [],
      };

      if (!bucketMap[row.employee_id]) bucketMap[row.employee_id] = emptyBucket();
      bucketMap[row.employee_id].sessions.push(session);
      sessionMap.set(row.id, session);
    });

    ((sessionProjectsRes.data as DbSessionProject[]) || []).forEach((row) => {
      const session = sessionMap.get(row.review_session_id);
      const project = projectMap.get(row.project_id);
      if (!session || !project) return;
      if (!session.projects.some((item) => item.id === project.id)) {
        session.projects.push(project);
      }
    });

    ((metricScoresRes.data as DbMetricScore[]) || []).forEach((row) => {
      const session = sessionMap.get(row.review_session_id);
      if (!session) return;
      if (!session.scores[row.project_id]) {
        session.scores[row.project_id] = createEmptyMetricScores();
      }
      session.scores[row.project_id][row.metric_code] = {
        level: row.level,
        comment: row.comment || "",
      };
    });

    ((employeeSkillsRes.data as DbEmployeeSkill[]) || []).forEach((row) => {
      if (!bucketMap[row.employee_id]) bucketMap[row.employee_id] = emptyBucket();
      bucketMap[row.employee_id].skills.push({
        id: String(row.id),
        name: row.skill_name,
      });
    });

    ((feedbackRes.data as DbFeedback[]) || []).forEach((row) => {
      const session = sessionMap.get(row.review_session_id);
      if (!session) return;
      session.feedback.push({
        id: String(row.id),
        projectId: row.project_id || "",
        respondentName: row.respondent_name || "",
        respondentRole: row.respondent_role || "",
        comfort: row.comfort || "",
        pull: row.pull || "",
        trust: row.trust || "",
        comment: row.comment || "",
      });
    });

    ((growthAreasRes.data as DbGrowthArea[]) || []).forEach((row) => {
      const session = sessionMap.get(row.review_session_id);
      if (!session) return;
      session.growthAreas.push({
        id: String(row.id),
        text: row.text || "",
      });
    });

    const nextAccessRequests: AccessRequest[] = ((accessRequestsRes.data as DbAccessRequest[]) || []).map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      requesterCuratorId: row.requester_curator_id,
      targetCuratorId: row.target_curator_id,
      status: row.status,
      createdAt: row.created_at,
    }));

    Object.values(bucketMap).forEach((bucket) => {
      bucket.sessions.sort(sortSessions);
    });

    setEmployees(nextEmployees);
    setCuratorAccessMap(nextCuratorAccessMap);
    setCuratorOptions(nextCuratorOptions);
    setAllProjectOptions(nextProjects.length ? nextProjects : initialAllProjectOptions);
    setEmployeeReviewMap(bucketMap);
    setAccessRequests(nextAccessRequests);
    setSkillOptions(((skillCatalogRes.data as DbSkillCatalog[]) || []).map((row) => row.name));
    setLoading(false);
  };

  loadData();
}, []);

  useEffect(() => {
    if (!filteredEmployees.length) return;
    const exists = filteredEmployees.some((employee) => employee.id === selectedEmployeeId);
    if (!exists) {
      setSelectedEmployeeId(filteredEmployees[0].id);
    }
  }, [filteredEmployees, selectedEmployeeId]);

  useEffect(() => {
    const availableCurators = curatorOptions.filter((curator) => curator.id !== currentUser.id);
    if (!availableCurators.length) {
      setShareCuratorId("");
      return;
    }
    if (!availableCurators.some((curator) => curator.id === shareCuratorId)) {
      setShareCuratorId(availableCurators[0].id);
    }
  }, [curatorOptions, currentUser.id, shareCuratorId]);

  useEffect(() => {
    if (!selectedEmployee) {
      setEditEmployeeName("");
      setEditEmployeeGrade("");
      return;
    }

    setEditEmployeeName(selectedEmployee.name || "");
    setEditEmployeeGrade(selectedEmployee.grade || "");
  }, [selectedEmployeeId, selectedEmployee?.name, selectedEmployee?.grade]);

  const employeeSessions = employeeReviewMap[selectedEmployeeId]?.sessions || [];

  const availableMeetings = useMemo(() => {
    return [...employeeSessions].sort(sortSessions);
  }, [employeeSessions]);

  useEffect(() => {
    if (!availableMeetings.length) return;
    const exists = availableMeetings.some((meeting) => meeting.meetingNumber === selectedMeetingNumber);
    if (!exists) {
      setSelectedMeetingNumber(availableMeetings[availableMeetings.length - 1].meetingNumber);
    }
  }, [availableMeetings, selectedMeetingNumber]);

  const currentSession = useMemo(() => {
    return employeeSessions.find((session) => session.meetingNumber === selectedMeetingNumber);
  }, [employeeSessions, selectedMeetingNumber]);

  const previousSession = useMemo(() => {
    if (!currentSession) return null;

    const sortedSessions = [...employeeSessions].sort(sortSessions);
    const currentIndex = sortedSessions.findIndex((session) => session.id === currentSession.id);

    if (currentIndex <= 0) return null;
    return sortedSessions[currentIndex - 1];
  }, [employeeSessions, currentSession]);

  const projects = currentSession?.projects || [];
  const scores = currentSession?.scores || {};
  const employeeSkills = employeeReviewMap[selectedEmployeeId]?.skills || [];
  const feedback = currentSession?.feedback || [];
  const meetingDate = currentSession?.meetingDate || "";
  const overallLevel = currentSession?.overallLevel || "mid";
  const previousOverallLevel = previousSession?.overallLevel || null;

  const availableProjects = useMemo(() => {
    const selectedIds = new Set(projects.map((project) => project.id));
    return allProjectOptions.filter((project) => !selectedIds.has(project.id));
  }, [projects, allProjectOptions]);

  const updateCurrentSession = (updater: (session: ReviewSession) => ReviewSession) => {
    setEmployeeReviewMap((prev) => ({
      ...prev,
      [selectedEmployeeId]: {
        ...prev[selectedEmployeeId],
        sessions: prev[selectedEmployeeId].sessions.map((session) => {
          if (session.id !== currentSession?.id) return session;
          const updated = updater(session);
          return { ...updated, id: makeSessionId(updated.meetingDate, updated.meetingNumber) };
        }),
      },
    }));
    setDirty(true);
  };

  const createNewMeeting = (meetingDateOverride?: string) => {
    const targetDate = (meetingDateOverride || newMeetingDate || new Date().toISOString().slice(0, 10)).trim();

    const sessions = employeeReviewMap[selectedEmployeeId]?.sessions || [];
    const nextMeetingNumber = String(
      sessions.length ? Math.max(...sessions.map((session) => Number(session.meetingNumber) || 0)) + 1 : 1
    );

    const newSession = createReviewSession({
      meetingNumber: nextMeetingNumber,
      meetingDate: targetDate,
      overallLevel: "mid",
      projects: [],
      scores: {},
      skills: [],
      feedback: [],
      growthAreas: [],
    });

    setEmployeeReviewMap((prev) => ({
      ...prev,
      [selectedEmployeeId]: {
        ...prev[selectedEmployeeId],
        sessions: [...prev[selectedEmployeeId].sessions, newSession],
      },
    }));

    setSelectedMeetingNumber(nextMeetingNumber);
    setNewMeetingDate("");
    setShowNewMeetingPicker(false);
    setDirty(true);
  };

	const shareEmployeeWithCurator = async () => {
	  if (!selectedEmployeeId || !shareCuratorId) return;

	  try {
		const { error } = await supabase
		  .from("curator_access")
		  .upsert(
			{
			  curator_id: shareCuratorId,
			  employee_id: selectedEmployeeId,
			},
			{
			  onConflict: "curator_id,employee_id",
			}
		  );

		if (error) throw error;

		setCuratorAccessMap((prev) => {
		  const existing = prev[shareCuratorId] || [];
		  if (existing.includes(selectedEmployeeId)) return prev;

		  return {
			...prev,
			[shareCuratorId]: [...existing, selectedEmployeeId],
		  };
		});

		alert("Доступ выдан");
	  } catch (error) {
		console.error(error);
		alert("Не удалось выдать доступ");
	  }
	};

  const requestAccessToEmployee = async (employeeId: string) => {
    if (!currentUser.id || hasAccessToEmployee(employeeId)) return;

    const existingPending = pendingAccessRequests.find(
      (request) => request.employeeId === employeeId && request.requesterCuratorId === currentUser.id
    );
    if (existingPending) {
      alert("Запрос уже отправлен");
      return;
    }

    try {
      setRequestingEmployeeId(employeeId);
      const { data, error } = await supabase
        .from("access_requests")
        .insert({
          employee_id: employeeId,
          requester_curator_id: currentUser.id,
          status: "pending",
        })
        .select("id, employee_id, requester_curator_id, target_curator_id, status, created_at")
        .single();

      if (error) throw error;

      if (data) {
        setAccessRequests((prev) => [
          {
            id: data.id,
            employeeId: data.employee_id,
            requesterCuratorId: data.requester_curator_id,
            targetCuratorId: data.target_curator_id,
            status: data.status,
            createdAt: data.created_at,
          },
          ...prev,
        ]);
      }
      alert("Запрос отправлен");
    } catch (error) {
      console.error(error);
      alert("Не удалось отправить запрос");
    } finally {
      setRequestingEmployeeId(null);
    }
  };

  const approveAccessRequest = async (request: AccessRequest) => {
    if (!canApproveRequest(request.employeeId)) return;

    try {
      setApprovingRequestId(request.id);
      const { error: accessError } = await supabase.from("curator_access").upsert(
        {
          curator_id: request.requesterCuratorId,
          employee_id: request.employeeId,
        },
        { onConflict: "curator_id,employee_id" }
      );
      if (accessError) throw accessError;

      const { error: requestError } = await supabase
        .from("access_requests")
        .update({ status: "approved", resolved_at: new Date().toISOString() })
        .eq("id", request.id);
      if (requestError) throw requestError;

      setCuratorAccessMap((prev) => ({
        ...prev,
        [request.requesterCuratorId]: [...new Set([...(prev[request.requesterCuratorId] || []), request.employeeId])],
      }));
      setAccessRequests((prev) => prev.map((item) => (item.id === request.id ? { ...item, status: "approved" } : item)));
      alert("Доступ одобрен");
    } catch (error) {
      console.error(error);
      alert("Не удалось одобрить запрос");
    } finally {
      setApprovingRequestId(null);
    }
  };

  const updateScore = (projectId: string, metricCode: MetricCode, field: keyof MetricScore, value: string) => {
    updateCurrentSession((session) => ({
      ...session,
      scores: {
        ...session.scores,
        [projectId]: {
          ...(session.scores[projectId] || createEmptyMetricScores()),
          [metricCode]: {
            ...((session.scores[projectId] || createEmptyMetricScores())[metricCode]),
            [field]: value as never,
          },
        },
      },
    }));
  };

  const addProjectToEmployee = () => {
    const project = availableProjects.find((item) => item.id === newProjectId);
    if (!project) return;

    updateCurrentSession((session) => ({
      ...session,
      projects: [...session.projects, project],
      scores: {
        ...session.scores,
        [project.id]: createEmptyMetricScores(),
      },
      feedback: session.feedback.map((item) => (!item.projectId ? { ...item, projectId: project.id } : item)),
    }));

    setNewProjectId("");
  };

  const createNewProjectOption = () => {
    const trimmedName = newProjectName.trim();
    const trimmedCode = newProjectCode.trim();
    if (!trimmedName) return;

    const baseId = slugifyProjectId(trimmedCode || trimmedName);
    let nextId = baseId;
    let suffix = 1;

    while (allProjectOptions.some((project) => project.id === nextId)) {
      suffix += 1;
      nextId = `${baseId}-${suffix}`;
    }

    const createdProject = {
      id: nextId,
      name: trimmedCode ? `${trimmedName} (${trimmedCode})` : trimmedName,
    };

    setAllProjectOptions((prev) => [...prev, createdProject]);
    setNewProjectId(createdProject.id);
    setNewProjectName("");
    setNewProjectCode("");
    setShowCreateProjectForm(false);
  };

  const removeProjectFromEmployee = (projectId: string) => {
    updateCurrentSession((session) => {
      const nextScores = { ...session.scores };
      delete nextScores[projectId];

      return {
        ...session,
        projects: session.projects.filter((project) => project.id !== projectId),
        scores: nextScores,
        feedback: session.feedback.map((item) => (item.projectId === projectId ? { ...item, projectId: "" } : item)),
      };
    });
  };

  const updateEmployeeSkills = (updater: (skills: Skill[]) => Skill[]) => {
    setEmployeeReviewMap((prev) => ({
      ...prev,
      [selectedEmployeeId]: {
        ...prev[selectedEmployeeId],
        skills: updater(prev[selectedEmployeeId]?.skills || []),
      },
    }));
    setDirty(true);
  };

  const addSkill = () => {
    updateEmployeeSkills((skills) => [...skills, { id: crypto.randomUUID(), name: "" }]);
  };

  const updateSkill = (id: string, value: string) => {
    updateEmployeeSkills((skills) => skills.map((item) => (item.id === id ? { ...item, name: value } : item)));
  };

  const removeSkill = (id: string) => {
    updateEmployeeSkills((skills) => skills.filter((item) => item.id !== id));
  };

  const addSkillOption = async () => {
    const value = newSkillOption.trim();
    if (!value) return;
    try {
      const { error } = await supabase.from("skill_catalog").insert({ name: value });
      if (error && !String(error.message || "").toLowerCase().includes("duplicate")) throw error;
      setSkillOptions((prev) => Array.from(new Set([...prev, value])).sort((a, b) => a.localeCompare(b)));
      setNewSkillOption("");
    } catch (error) {
      console.error(error);
      alert("Не удалось добавить навык в справочник");
    }
  };

  const addGrowthArea = () => {
    updateCurrentSession((session) => ({
      ...session,
      growthAreas: [...(session.growthAreas || []), { id: crypto.randomUUID(), text: "" }],
    }));
  };

  const updateGrowthArea = (id: string, value: string) => {
    updateCurrentSession((session) => ({
      ...session,
      growthAreas: (session.growthAreas || []).map((item) => (item.id === id ? { ...item, text: value } : item)),
    }));
  };

  const removeGrowthArea = (id: string) => {
    updateCurrentSession((session) => ({
      ...session,
      growthAreas: (session.growthAreas || []).filter((item) => item.id !== id),
    }));
  };

  const addFeedback = () => {
    updateCurrentSession((session) => ({
      ...session,
      feedback: [
        ...session.feedback,
        {
          id: crypto.randomUUID(),
          projectId: session.projects[0]?.id || "",
          respondentName: "",
          respondentRole: "",
          comfort: "",
          pull: "",
          trust: "",
          comment: "",
        },
      ],
    }));
  };

  const updateFeedback = (id: string, field: keyof FeedbackItem, value: string) => {
    updateCurrentSession((session) => ({
      ...session,
      feedback: session.feedback.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeFeedback = (id: string) => {
    updateCurrentSession((session) => ({
      ...session,
      feedback: session.feedback.filter((item) => item.id !== id),
    }));
  };


const updateSelectedEmployee = async () => {
  if (!selectedEmployeeId || !selectedEmployee) return;

  const fullName = editEmployeeName.trim();
  const grade = editEmployeeGrade.trim();
  if (!fullName) return;

  try {
    setEditingEmployee(true);

    const { error } = await supabase
      .from("employees")
      .update({ full_name: fullName, grade: grade || null })
      .eq("id", selectedEmployeeId);

    if (error) throw error;

    setEmployees((prev) =>
      prev.map((employee) =>
        employee.id === selectedEmployeeId ? { ...employee, name: fullName, grade: grade || "" } : employee
      )
    );

    setShowEditEmployeeForm(false);
  } catch (error) {
    console.error(error);
    alert("Не удалось обновить сотрудника.");
  } finally {
    setEditingEmployee(false);
  }
};


const addNewEmployee = async () => {
  const fullName = newEmployeeName.trim();
  const grade = newEmployeeGrade.trim();
  if (!fullName) return;

  try {
    setAddingEmployee(true);
    const employeeId = crypto.randomUUID();

    const { error: employeeError } = await supabase.from("employees").insert({
      id: employeeId,
      full_name: fullName,
      grade: grade || null,
    });
    if (employeeError) throw employeeError;

    const { error: accessError } = await supabase.from("curator_access").insert({
      curator_id: currentUser.id,
      employee_id: employeeId,
    });
    if (accessError) throw accessError;

    const newEmployee = { id: employeeId, name: fullName, grade: grade || "" };
    setEmployees((prev) => [...prev, newEmployee]);
    setCuratorAccessMap((prev) => ({
      ...prev,
      [currentUser.id]: [...(prev[currentUser.id] || []), employeeId],
    }));
    setEmployeeReviewMap((prev) => ({
      ...prev,
      [employeeId]: { sessions: [], skills: [] },
    }));
    setSelectedEmployeeId(employeeId);
    setShowAddEmployeeForm(false);
    setNewEmployeeName("");
    setNewEmployeeGrade("");
  } catch (error) {
    console.error(error);
    alert("Не удалось добавить сотрудника.");
  } finally {
    setAddingEmployee(false);
  }
};


const deleteSelectedEmployee = async () => {
  if (!selectedEmployeeId || !selectedEmployee) return;

  const ok = window.confirm(`Удалить сотрудника "${selectedEmployee.name}"?`);
  if (!ok) return;

  try {
    setDeletingEmployee(true);

    const { error } = await supabase.from("employees").delete().eq("id", selectedEmployeeId);
    if (error) throw error;

    const nextEmployees = employees.filter((employee) => employee.id !== selectedEmployeeId);
    const nextCuratorAccessMap = Object.fromEntries(
      Object.entries(curatorAccessMap).map(([curatorId, ids]) => [
        curatorId,
        ids.filter((id) => id !== selectedEmployeeId),
      ])
    );
    const nextEmployeeReviewMap = { ...employeeReviewMap };
    delete nextEmployeeReviewMap[selectedEmployeeId];

    setEmployees(nextEmployees);
    setCuratorAccessMap(nextCuratorAccessMap);
    setEmployeeReviewMap(nextEmployeeReviewMap);

    const nextAllowed = nextCuratorAccessMap[currentUser.id] || [];
    const nextSelected = nextEmployees.find((employee) => nextAllowed.includes(employee.id));
    setSelectedEmployeeId(nextSelected?.id || "");
    setDirty(false);
  } catch (error) {
    console.error(error);
    alert("Не удалось удалить сотрудника.");
  } finally {
    setDeletingEmployee(false);
  }
};


const saveAllToDb = async () => {
  if (!currentSession || !selectedEmployeeId) return;

  try {
    setSaving(true);

    if (allProjectOptions.length) {
      const { error: upsertProjectsError } = await supabase.from("projects").upsert(
        allProjectOptions.map((project) => ({ id: project.id, name: project.name })),
        { onConflict: "id" }
      );
      if (upsertProjectsError) throw upsertProjectsError;
    }

    const uniqueSkillOptions = Array.from(new Set(skillOptions.map((item) => item.trim()).filter(Boolean)));
    if (uniqueSkillOptions.length) {
      const { error: skillCatalogError } = await supabase
        .from("skill_catalog")
        .upsert(uniqueSkillOptions.map((name) => ({ name })), { onConflict: "name" });
      if (skillCatalogError) throw skillCatalogError;
    }

    const sessionPayload = {
      employee_id: selectedEmployeeId,
      meeting_number: Number(currentSession.meetingNumber),
      meeting_date: currentSession.meetingDate,
      overall_level: currentSession.overallLevel,
    };

    const { data: sessionRow, error: sessionError } = await supabase
      .from("review_sessions")
      .upsert(sessionPayload, { onConflict: "employee_id,meeting_date,meeting_number" })
      .select("id")
      .single();

    if (sessionError) throw sessionError;

    const reviewSessionId = sessionRow.id as number;

    await supabase.from("session_projects").delete().eq("review_session_id", reviewSessionId);
    if (currentSession.projects.length) {
      const { error: sessionProjectsError } = await supabase.from("session_projects").insert(
        currentSession.projects.map((project) => ({
          review_session_id: reviewSessionId,
          project_id: project.id,
        }))
      );
      if (sessionProjectsError) throw sessionProjectsError;
    }

    await supabase.from("session_metric_scores").delete().eq("review_session_id", reviewSessionId);
    const metricRows = currentSession.projects.flatMap((project) =>
      metrics.map((metric) => ({
        review_session_id: reviewSessionId,
        project_id: project.id,
        metric_code: metric.code,
        level: (currentSession.scores[project.id]?.[metric.code]?.level || "mid") as Level,
        comment: currentSession.scores[project.id]?.[metric.code]?.comment || "",
      }))
    );
    if (metricRows.length) {
      const { error: metricError } = await supabase.from("session_metric_scores").insert(metricRows);
      if (metricError) throw metricError;
    }

    await supabase.from("employee_skills").delete().eq("employee_id", selectedEmployeeId);
    const skillRows = employeeSkills
      .map((skill) => skill.name.trim())
      .filter(Boolean)
      .map((skillName) => ({
        employee_id: selectedEmployeeId,
        skill_name: skillName,
      }));
    if (skillRows.length) {
      const { error: skillsError } = await supabase.from("employee_skills").insert(skillRows);
      if (skillsError) throw skillsError;
    }

    await supabase.from("session_feedback").delete().eq("review_session_id", reviewSessionId);
    const feedbackRows = currentSession.feedback.map((item) => ({
      review_session_id: reviewSessionId,
      project_id: item.projectId || null,
      respondent_name: item.respondentName || null,
      respondent_role: item.respondentRole || null,
      comfort: item.comfort || null,
      pull: item.pull || null,
      trust: item.trust || null,
      comment: item.comment || null,
    }));
    if (feedbackRows.length) {
      const { error: feedbackError } = await supabase.from("session_feedback").insert(feedbackRows);
      if (feedbackError) throw feedbackError;
    }

    await supabase.from("growth_areas").delete().eq("review_session_id", reviewSessionId);
    const growthRows = (currentSession.growthAreas || [])
      .map((item) => item.text.trim())
      .filter(Boolean)
      .map((text) => ({ review_session_id: reviewSessionId, text }));
    if (growthRows.length) {
      const { error: growthError } = await supabase.from("growth_areas").insert(growthRows);
      if (growthError) throw growthError;
    }

    setEmployeeReviewMap((prev) => ({
      ...prev,
      [selectedEmployeeId]: {
        ...prev[selectedEmployeeId],
        sessions: prev[selectedEmployeeId].sessions.map((session) =>
          session.id === currentSession.id ? { ...session, dbId: reviewSessionId } : session
        ),
      },
    }));

    setDirty(false);
  } catch (error) {
    console.error(error);
    alert("Не удалось сохранить в БД. Посмотри ошибку в консоли.");
  } finally {
    setSaving(false);
  }
};


  const tableMinWidth = `${220 + 280 + projects.length * 280 + Math.max(projects.length - 1, 0) * 16}px`;
  const tableColumns = `220px 280px repeat(${projects.length}, 280px)`;

  if (authLoading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100">Проверяем вход...</div>;
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-slate-900 dark:text-slate-100">
        <div className="rounded-2xl border bg-white dark:bg-slate-900 p-8 shadow-sm">
          <div className="mb-4 text-xl font-semibold">Performance Review</div>
          <Button onClick={signInWithGoogle}>Войти через Google</Button>
        </div>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-slate-900 dark:text-slate-100">
        <div className="max-w-md rounded-2xl border bg-white dark:bg-slate-900 p-8 shadow-sm space-y-4">
          <div className="text-xl font-semibold">Нет доступа</div>
          <div className="text-sm text-slate-600 dark:text-slate-300">Для аккаунта {authUser.email} ещё не настроен доступ.</div>
          <Button variant="outline" onClick={signOut}>Выйти</Button>
        </div>
      </div>
    );
  }

  if (showIntro) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100">
        <div className="mx-auto grid min-h-[calc(100vh-48px)] max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="flex h-full flex-col justify-between p-8 lg:p-10">
              <div className="space-y-6">
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  Performance Review
                </Badge>
                <div className="space-y-4">
                  <h1 className="text-3xl font-semibold tracking-tight lg:text-5xl">
                    АНТИ KPI
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 lg:text-lg">
                    Вайбкод-система по замене гуглодоков, вордов и тому подобного по KPI.
					По результатам дискуссии в телеге пришли к выводу что KPI как таковые никому не нравятся, решили попробовать заменить их.
					Листы:
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
                    <div className="mb-2 text-sm font-medium">Перформанс-профиль</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">Оценка по метрикам, проектам и динамике между встречами.</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
                    <div className="mb-2 text-sm font-medium">Уникальные навыки</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">Навыки сотрудника без привязки к конкретной встрече.</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
                    <div className="mb-2 text-sm font-medium">360 и шаринг</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">Фидбек коллег и возможность передавать сотрудника другому куратору.</div>
                  </div>
                </div>
              </div>


              <div className="mt-8 flex flex-wrap gap-3">
                {authUser ? (
                  <Button onClick={() => setShowIntro(false)} size="lg">
                    Открыть приложение
                  </Button>
                ) : (
                  <Button onClick={signInWithGoogle} size="lg">
                    Войти через Google
                  </Button>
                )}
                <Button variant="outline" size="lg" onClick={toggleTheme}>
                  {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
                </Button>
                {authUser ? (
                  <Button variant="outline" size="lg" onClick={signOut}>
                    Выйти
                  </Button>
                ) : null}
              </div>
			 <Image
				src="/kpi.png"
				alt="preview"
				width={800}
				height={800}
				className="h-full w-full object-cover"
			 />
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="flex h-full flex-col justify-between p-8">
              <div className="space-y-5">
                <div>
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Текущий статус</div>
                  <div className="mt-2 text-2xl font-semibold">
                    {authUser ? "Вход выполнен" : "Нужна авторизация"}
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
                  <div className="text-sm font-medium">Привет, куратор</div>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <li>• Если хочешь создать нового сотрудника - так и кликай.</li>
                    <li>• Если знаешь что сотрудник уже создан (например, был у другого куратора до этого) - попроси у него доступ.</li>
                    <li>• Уровень jun/mid/senior и т.д. оцениваем по вайбу, четких критериев не предъявляется</li>
                    <li>• Если ты Карен, то попроси дядю Вадика выдать тебе админа, чтоб видеть всех</li>
                  </ul>
                </div>

                {authUser ? (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-sm">
                    <div className="font-medium">{currentUser.name || authUser.email}</div>
                    <div className="mt-1 break-all text-slate-500 dark:text-slate-400">{authUser.email}</div>
                    <div className="mt-3">
                      <Badge className="rounded-full border-0 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-900">
                        {currentUserRole === "admin" ? "Админ" : "Куратор"}
                      </Badge>
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100">
      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardHeader className="space-y-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Сотрудники
            </CardTitle>

			<div className="space-y-2">
			  <Button variant="outline" onClick={() => setShowAddEmployeeForm((prev) => !prev)} className="w-full">
				<Plus className="mr-2 h-4 w-4" />
				Добавить сотрудника
			  </Button>

			  <Button
				variant="outline"
				onClick={() => setShowEditEmployeeForm((prev) => !prev)}
				disabled={!selectedEmployeeId}
				className="w-full"
			  >
				<Pencil className="mr-2 h-4 w-4" />
				Править
			  </Button>

			  <Button
				variant="outline"
				onClick={deleteSelectedEmployee}
				disabled={!selectedEmployeeId || deletingEmployee}
				className="w-full"
			  >
				<Trash2 className="mr-2 h-4 w-4" />
				{deletingEmployee ? "Удаляю..." : "Удалить"}
			  </Button>
			</div>

            {showAddEmployeeForm ? (
              <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3">
                <div>
                  <Label className="mb-2 block">ФИО</Label>
                  <Input
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    placeholder="Например, Иван Иванов"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Должность / grade</Label>
                  <Select value={newEmployeeGrade} onValueChange={setNewEmployeeGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выбери должность" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeOptions.map((gradeOption) => (
                        <SelectItem key={gradeOption} value={gradeOption}>
                          {gradeOption}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addNewEmployee} disabled={!newEmployeeName.trim() || addingEmployee}>
                    {addingEmployee ? "Добавляю..." : "Создать"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowAddEmployeeForm(false);
                      setNewEmployeeName("");
                      setNewEmployeeGrade("");
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            ) : null}

            {showEditEmployeeForm ? (
              <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                <div>
                  <Label className="mb-2 block">ФИО</Label>
                  <Input
                    value={editEmployeeName}
                    onChange={(e) => setEditEmployeeName(e.target.value)}
                    placeholder="Например, Иван Иванов"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Должность / grade</Label>
                  <Select value={editEmployeeGrade} onValueChange={setEditEmployeeGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выбери должность" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeOptions.map((gradeOption) => (
                        <SelectItem key={gradeOption} value={gradeOption}>
                          {gradeOption}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={updateSelectedEmployee} disabled={!editEmployeeName.trim() || editingEmployee}>
                    {editingEmployee ? "Сохраняю..." : "Сохранить изменения"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowEditEmployeeForm(false);
                      setEditEmployeeName(selectedEmployee?.name || "");
                      setEditEmployeeGrade(selectedEmployee?.grade || "");
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск" className="pl-9" />
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Share2 className="h-4 w-4" />
                Поделиться сотрудником
              </div>
              <div className="flex gap-2">
                <Select value={shareCuratorId} onValueChange={setShareCuratorId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {curatorOptions
                      .filter((curator) => curator.id !== currentUser.id)
                      .map((curator) => (
                        <SelectItem key={curator.id} value={curator.id}>
                          {curator.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={shareEmployeeWithCurator}>
                  Дать доступ
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 text-sm">
              <div className="flex items-center justify-between gap-2"><div className="font-medium">{currentUser.name}</div><Badge variant={currentUser.role === "admin" ? "default" : "secondary"}>{currentUser.role === "admin" ? "Админ" : "Куратор"}</Badge></div>
              <div className="text-slate-500 dark:text-slate-400 break-all">{authUser.email}</div>
              <Button variant="outline" className="mt-3 w-full" onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
              </Button>
              <Button variant="outline" className="mt-3 w-full" onClick={signOut}>
                Выйти
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <Tabs value={employeeListTab} onValueChange={(value) => setEmployeeListTab(value as "mine" | "all")} className="space-y-3">
              <TabsList className="grid w-full grid-cols-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <TabsTrigger value="mine">Мои</TabsTrigger>
                <TabsTrigger value="all">Все сотрудники</TabsTrigger>
              </TabsList>

              <TabsContent value="mine" className="space-y-3">
                {filteredEmployees.map((employee) => {
                  const active = employee.id === selectedEmployeeId;

                  return (
                    <button
                      key={employee.id}
                      onClick={() => {
                        setSelectedEmployeeId(employee.id);
                        setDirty(false);
                      }}
                      className={`w-full rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-left transition ${
                        active ? "border-slate-900 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className={`text-sm ${active ? "text-slate-300 dark:text-slate-600" : "text-slate-500 dark:text-slate-400"}`}>{employee.grade}</div>
                      </div>
                    </button>
                  );
                })}
                {!filteredEmployees.length ? <div className="text-sm text-slate-500 dark:text-slate-400">Пока нет сотрудников</div> : null}
              </TabsContent>

              <TabsContent value="all" className="space-y-3">
                {allEmployeesFiltered.map((employee) => {
                  const hasAccess = hasAccessToEmployee(employee.id);
                  const pendingOwnRequest = getPendingRequestForEmployee(employee.id);
                  const requestsForEmployee = pendingAccessRequests.filter((request) => request.employeeId === employee.id);

                  return (
                    <div key={employee.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
                      <div className="font-medium">{employee.name}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{employee.grade}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {hasAccess ? (
                          <Badge variant="secondary">Уже есть доступ</Badge>
                        ) : pendingOwnRequest ? (
                          <Badge variant="secondary">Запрос отправлен</Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={requestingEmployeeId === employee.id}
                            onClick={() => requestAccessToEmployee(employee.id)}
                          >
                            {requestingEmployeeId === employee.id ? "Отправляю..." : "Запросить права"}
                          </Button>
                        )}
                        {requestsForEmployee.map((request) =>
                          canApproveRequest(employee.id) && request.requesterCuratorId !== currentUser.id ? (
                            <Button
                              key={request.id}
                              size="sm"
                              onClick={() => approveAccessRequest(request)}
                              disabled={approvingRequestId === request.id}
                            >
                              {approvingRequestId === request.id ? "Одобряю..." : "Одобрить запрос"}
                            </Button>
                          ) : null
                        )}
                      </div>
                    </div>
                  );
                })}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[260px_minmax(0,1fr)] xl:min-h-[132px]">
                <div className="flex min-h-[84px] flex-col justify-start overflow-hidden">
                  <div className="truncate text-2xl font-semibold leading-tight" title={selectedEmployee?.name}>
                    {selectedEmployee?.name}
                  </div>
                  <div className="mt-2 truncate text-sm text-slate-500 dark:text-slate-400" title={selectedEmployee?.grade}>
                    {selectedEmployee?.grade}
                  </div>
                  <div className="mt-4">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className={`w-[140px] rounded-xl justify-center ${HEADER_CONTROL_CLASS}`}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Сохраняю..." : "Сохранить"}
                    </Button>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <Label>Общий уровень</Label>
                    <Select value={overallLevel} onValueChange={handleOverallLevelChange}>
                      <SelectTrigger className={`w-[160px] ${HEADER_CONTROL_CLASS}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {levelOptions.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="pt-1">
                      <DeltaBadge currentLevel={overallLevel} previousLevel={previousOverallLevel} emptyLabel />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-rows-[auto_auto]">
                  <div className="grid gap-3 xl:grid-cols-[150px_210px_170px] xl:items-end">
                    <div className="flex flex-col gap-2">
                      <Label className="opacity-0">.</Label>
                      <Button variant="outline" onClick={handleCreateMeeting} className={`w-[150px] justify-center ${HEADER_CONTROL_CLASS}`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Новая встреча
                      </Button>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className="opacity-0">.</Label>
                      {showNewMeetingPicker ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="date"
                            value={newMeetingDate}
                            onChange={(e) => setNewMeetingDate(e.target.value)}
                            className={`w-[210px] ${HEADER_CONTROL_CLASS}`}
                          />
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (newMeetingDate) {
                                createNewMeeting(newMeetingDate);
                              }
                            }}
                          >
                            Ок
                          </Button>
                        </div>
                      ) : (
                        <div className="h-10 w-[210px]" />
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label>Встреча</Label>
                      <Select value={selectedMeetingNumber} onValueChange={handleMeetingChange}>
                        <SelectTrigger className={`w-[170px] ${HEADER_CONTROL_CLASS}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMeetings.map((session) => (
                            <SelectItem key={session.id} value={session.meetingNumber}>
                              №{session.meetingNumber} · {session.meetingDate.split("-").reverse().join(".")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-[170px] xl:items-end">
					<div className="flex flex-col gap-2">
					  <Label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
						<CalendarDays className="h-4 w-4" />
						Дата встречи
					  </Label>

					  <div
						className={`flex h-10 w-[170px] items-center rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 text-sm text-slate-700 ${HEADER_CONTROL_CLASS}`}
					  >
						{meetingDate
						  ? meetingDate.split("-").reverse().join(".")
						  : "—"}
					  </div>
					</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Briefcase className="h-4 w-4" />
              {projects.length} проекта(ов) в review
            </div>
            {dirty ? (
              <Badge className="justify-self-center border-0 bg-red-600 px-4 py-1 text-white hover:bg-red-600">Есть несохранённые изменения</Badge>
            ) : (
              <Badge className="justify-self-center border-0 bg-emerald-600 px-4 py-1 text-white hover:bg-emerald-600">Всё сохранено</Badge>
            )}
            <div />
          </div>

          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <TabsTrigger value="profile">Перформанс-профиль</TabsTrigger>
              <TabsTrigger value="skills">Уникальные навыки</TabsTrigger>
              <TabsTrigger value="feedback">360</TabsTrigger>
              <TabsTrigger value="growth">Зоны роста</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader className="gap-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <CardTitle className="text-lg">Оценка по проектам</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        {projects.map((project) => (
                          <div key={project.id} className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-3 py-1 text-sm">
                            <span>{project.name}</span>
                            <button
                              type="button"
                              onClick={() => removeProjectFromEmployee(project.id)}
                              className="rounded-full p-0.5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 hover:text-slate-900"
                              aria-label={`Удалить проект ${project.name}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Select value={newProjectId} onValueChange={setNewProjectId}>
                          <SelectTrigger className="w-[240px]">
                            <SelectValue placeholder="Добавить проект" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProjects.length > 0 ? (
                              availableProjects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-projects" disabled>
                                Все проекты уже добавлены
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>

                        <Button onClick={addProjectToEmployee} disabled={!newProjectId}>
                          <Plus className="mr-2 h-4 w-4" />
                          Добавить проект
                        </Button>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => setShowCreateProjectForm((prev) => !prev)}
                        className="w-full sm:w-auto"
                      >
                        <FolderPlus className="mr-2 h-4 w-4" />
                        {showCreateProjectForm ? "Скрыть форму" : "Создать новый проект"}
                      </Button>

                      {showCreateProjectForm && (
                        <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label className="mb-2 block">Название проекта</Label>
                              <Input
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                placeholder="Например, Газпромбанк AML"
                              />
                            </div>
                            <div>
                              <Label className="mb-2 block">Код / короткое имя</Label>
                              <Input
                                value={newProjectCode}
                                onChange={(e) => setNewProjectCode(e.target.value)}
                                placeholder="Например, GPB-AML"
                              />
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <Button onClick={createNewProjectOption} disabled={!newProjectName.trim()}>
                              Создать в справочнике
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setShowCreateProjectForm(false);
                                setNewProjectName("");
                                setNewProjectCode("");
                              }}
                            >
                              Отмена
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {projects.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500 dark:text-slate-400">
                      У этой встречи пока нет проектов. Добавь проект сверху.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="space-y-4" style={{ minWidth: tableMinWidth }}>
                        <div className="grid gap-4 px-1 text-sm font-medium text-slate-500 dark:text-slate-400" style={{ gridTemplateColumns: tableColumns }}>
                          <div>Метрика</div>
                          <div>На что смотрим</div>
                          {projects.map((project) => (
                            <div key={project.id}>{project.name}</div>
                          ))}
                        </div>

                        {metrics.map((metric) => (
                          <div
                            key={metric.code}
                            className="grid gap-4 rounded-2xl border bg-white dark:bg-slate-900 p-4"
                            style={{ gridTemplateColumns: tableColumns }}
                          >
                            <div>
                              <div className="font-semibold">{metric.name}</div>
                            </div>

                            <div className="text-sm text-slate-600 dark:text-slate-300">
                              <ul className="space-y-1">
                                {metric.hints.map((hint) => (
                                  <li key={hint}>• {hint}</li>
                                ))}
                              </ul>
                            </div>

                            {projects.map((project) => (
                              <div key={project.id} className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                                <div>
                                  <Label className="mb-2 flex items-center gap-2">
                                    Оценка
                                    <DeltaBadge
                                      currentLevel={scores[project.id]?.[metric.code]?.level}
                                      previousLevel={previousOverallLevel}
                                    />
                                  </Label>
                                  <Select
                                    value={scores[project.id]?.[metric.code]?.level || "mid"}
                                    onValueChange={(value: Level) => updateScore(project.id, metric.code, "level", value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {levelOptions.map((level) => (
                                        <SelectItem key={level} value={level}>
                                          {level}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="mb-2 block">Краткий комментарий</Label>
                                  <Textarea
                                    value={scores[project.id]?.[metric.code]?.comment || ""}
                                    onChange={(e) => updateScore(project.id, metric.code, "comment", e.target.value)}
                                    placeholder="Что было хорошо / плохо по этой метрике"
                                    className="min-h-[90px]"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="skills">
              <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Star className="h-5 w-5" />
                    Уникальные навыки
                  </CardTitle>
                  <Button variant="outline" onClick={addSkill}>
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
                    <div className="mb-2 text-sm font-medium">Справочник навыков</div>
                    <div className="flex gap-2">
                      <Input
                        value={newSkillOption}
                        onChange={(e) => setNewSkillOption(e.target.value)}
                        placeholder="Добавить навык в общий список"
                      />
                      <Button variant="outline" onClick={addSkillOption} disabled={!newSkillOption.trim()}>
                        <Plus className="mr-2 h-4 w-4" />
                        В справочник
                      </Button>
                    </div>
                  </div>

                  {employeeSkills.map((skill, index) => (
                    <div key={skill.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-3">
                      <div className="text-sm text-slate-500 dark:text-slate-400">{index + 1}</div>
                      <div className="grid gap-3 md:grid-cols-[220px_1fr_auto] md:items-start">
                        <Select value={skillOptions.includes(skill.name) ? skill.name : "__custom__"} onValueChange={(value) => {
                          if (value !== "__custom__") updateSkill(skill.id, value);
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Выбери навык" />
                          </SelectTrigger>
                          <SelectContent>
                            {skillOptions.map((option) => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                            <SelectItem value="__custom__">Свой вариант</SelectItem>
                          </SelectContent>
                        </Select>

                        <Input value={skill.name} onChange={(e) => updateSkill(skill.id, e.target.value)} placeholder="Или впиши свой навык" />
                        <Button variant="ghost" size="icon" onClick={() => removeSkill(skill.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="growth">
              <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Зоны роста</CardTitle>
                  <Button variant="outline" onClick={addGrowthArea}>
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(currentSession?.growthAreas || []).map((item, index) => (
                    <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
                      <div className="w-8 pt-2 text-sm text-slate-500 dark:text-slate-400">{index + 1}</div>
                      <Textarea value={item.text} onChange={(e) => updateGrowthArea(item.id, e.target.value)} placeholder="Что прокачать / что подтянуть" className="min-h-[90px]" />
                      <Button variant="ghost" size="icon" onClick={() => removeGrowthArea(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {!(currentSession?.growthAreas || []).length ? (
                    <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500 dark:text-slate-400">Пока нет зон роста. Добавь сверху.</div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="feedback">
              <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">360 feedback</CardTitle>
                  <Button variant="outline" onClick={addFeedback}>
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить ответ
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {feedback.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="font-medium">Ответ #{index + 1}</div>
                        <Button variant="ghost" size="icon" onClick={() => removeFeedback(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label className="mb-2 block">Проект</Label>
                          <Select value={item.projectId} onValueChange={(value) => updateFeedback(item.id, "projectId", value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Выбери проект" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.length > 0 ? (
                                projects.map((project) => (
                                  <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-projects-feedback" disabled>
                                  Сначала добавь проект
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="mb-2 block">Кто ответил</Label>
                          <Input value={item.respondentName} onChange={(e) => updateFeedback(item.id, "respondentName", e.target.value)} placeholder="Имя" />
                        </div>

                        <div>
                          <Label className="mb-2 block">Роль</Label>
                          <Input value={item.respondentRole} onChange={(e) => updateFeedback(item.id, "respondentRole", e.target.value)} placeholder="Лид / коллега / заказчик" />
                        </div>

                        <div>
                          <Label className="mb-2 block">С ним работать комфортно?</Label>
                          <Input value={item.comfort} onChange={(e) => updateFeedback(item.id, "comfort", e.target.value)} placeholder="Ответ" />
                        </div>

                        <div>
                          <Label className="mb-2 block">Тащит или нет?</Label>
                          <Input value={item.pull} onChange={(e) => updateFeedback(item.id, "pull", e.target.value)} placeholder="Ответ" />
                        </div>

                        <div>
                          <Label className="mb-2 block">Доверил бы сложный проект?</Label>
                          <Input value={item.trust} onChange={(e) => updateFeedback(item.id, "trust", e.target.value)} placeholder="Ответ" />
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div>
                        <Label className="mb-2 block">Комментарий</Label>
                        <Textarea value={item.comment} onChange={(e) => updateFeedback(item.id, "comment", e.target.value)} placeholder="Свободный комментарий" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Smoke-test scenarios for this mock UI:
          1) u1 sees employees 1 and 2, but not 3.
          2) Changing meeting date to 2026-05-10 makes 2026 appear in year selector.
          3) Delta badge compares current overall/metric level to previous session overall level.
          4) Share button adds current employee to another curator's accessible list.
      */}
    </div>
  );
}
//test