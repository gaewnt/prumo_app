import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { StatCard } from "@/components/ui/stat-card";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { MonthHeatmap } from "@/components/ui/month-heatmap";
import { MonthNav } from "@/components/ui/month-nav";
import { ModuleTabs } from "@/components/ui/module-tabs";
import { SearchInput } from "@/components/ui/search-input";
import { SessionLogger } from "@/components/estudos/session-logger";
import { SessionHistoryRow } from "@/components/estudos/session-history-row";
import { NewSubjectForm } from "@/components/estudos/new-subject-form";
import { SubjectRow } from "@/components/estudos/subject-row";
import { NewClassScheduleForm } from "@/components/estudos/new-class-schedule-form";
import { ClassScheduleRow } from "@/components/estudos/class-schedule-row";
import { NewTaskForm } from "@/components/estudos/new-task-form";
import { TaskRow } from "@/components/estudos/task-row";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchEstudos,
  fetchEstudosLogsForMonth,
  createSubject,
  updateSubject,
  deleteSubject,
  createClassSchedule,
  updateClassSchedule,
  deleteClassSchedule,
  schedulesForWeekday,
  logStudySession,
  updateStudySession,
  undoLastStudySession,
  computeMinutesLast7Days,
  computeWeeklyMinutesByDay,
  computeSubjectBreakdown,
  computeDayMinutes,
  computeStudyStreak,
  streakMilestone,
  createStudyTask,
  updateStudyTask,
  deleteStudyTask,
  toggleStudyTaskDone,
  SUBJECT_COLOR_KEYS,
  type SubjectColorKey,
  type StudyTask,
  type StudyTaskInput,
  type ClassSchedule,
  type ClassScheduleInput,
} from "@/lib/estudos";
import { BibliotecaContent } from "./biblioteca";

const WEEKDAY_FULL_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

const TABS = [
  { key: "estudos", label: "Matérias" },
  { key: "biblioteca", label: "Biblioteca" },
];

/** Conteúdo de Estudos (matérias) — usado tanto na rota própria quanto como aba dentro do hub Estudos. */
export function EstudosContent() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const query = useQuery({
    queryKey: ["estudos", userId],
    queryFn: fetchEstudos,
    enabled: !!userId,
  });
  const subjects = query.data?.subjects ?? [];
  const schedules = query.data?.schedules ?? [];
  const sessions = query.data?.sessions ?? [];
  const tasks = query.data?.tasks ?? [];
  const metaMinutosSemana = query.data?.metaMinutosSemana ?? null;

  // Histórico de meses anteriores — mesmo padrão da Rotina: o mês atual
  // reaproveita `sessions` (já vem na busca de sempre), só busca de novo ao navegar pra outro mês.
  const now = new Date();
  const [historyMonth, setHistoryMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const isCurrentHistoryMonth =
    historyMonth.getFullYear() === now.getFullYear() && historyMonth.getMonth() === now.getMonth();
  const historySessionsQuery = useQuery({
    queryKey: ["estudos", "monthLogs", userId, historyMonth.getFullYear(), historyMonth.getMonth()],
    queryFn: () => fetchEstudosLogsForMonth(historyMonth),
    enabled: !!userId && !isCurrentHistoryMonth,
  });
  const heatmapSessions = isCurrentHistoryMonth ? sessions : historySessionsQuery.data ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["estudos", userId] });
  }

  function colorFor(colorKey: SubjectColorKey) {
    return tokens[colorKey];
  }

  function subjectNameFor(subjectId: string) {
    return subjects.find((s) => s.id === subjectId)?.name ?? "";
  }

  const minutesLast7Days = computeMinutesLast7Days(sessions);
  const weeklyMinutes = computeWeeklyMinutesByDay(sessions);
  const subjectBreakdown = computeSubjectBreakdown(subjects, sessions, colorFor);
  const sessionDates = new Set(sessions.map((s) => s.session_date));
  const streak = computeStudyStreak(sessionDates);
  const milestone = streakMilestone(streak);
  const lastSession = sessions[sessions.length - 1];

  // Busca nas tarefas/provas — a lista acumula rápido ao longo de um semestre.
  const [taskSearch, setTaskSearch] = useState("");
  const taskSearchTerm = taskSearch.trim().toLowerCase();
  const matchesTaskSearch = (t: (typeof tasks)[number]) =>
    taskSearchTerm.length === 0 ||
    t.title.toLowerCase().includes(taskSearchTerm) ||
    (t.notes ?? "").toLowerCase().includes(taskSearchTerm);
  const pendingTasks = tasks.filter((t) => !t.done && matchesTaskSearch(t));
  const doneTasks = tasks.filter((t) => t.done && matchesTaskSearch(t));

  const weekdaysWithClasses = [0, 1, 2, 3, 4, 5, 6].filter((weekday) => schedulesForWeekday(schedules, weekday).length > 0);

  const createSubjectMutation = useMutation({
    mutationFn: ({ name, colorKey }: { name: string; colorKey: SubjectColorKey }) =>
      createSubject(userId!, name, colorKey),
    onSuccess: () => {
      setShowSubjectForm(false);
      invalidate();
    },
  });
  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, name, colorKey }: { id: string; name: string; colorKey: SubjectColorKey }) =>
      updateSubject(id, name, colorKey),
    onSuccess: () => {
      setEditingSubjectId(null);
      invalidate();
    },
  });
  const deleteSubjectMutation = useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onSuccess: invalidate,
  });

  const createScheduleMutation = useMutation({
    mutationFn: ({ subjectId, subjectName, input }: { subjectId: string; subjectName: string; input: ClassScheduleInput }) =>
      createClassSchedule(userId!, subjectId, subjectName, input),
    onSuccess: () => {
      setShowScheduleForm(false);
      invalidate();
    },
  });
  const updateScheduleMutation = useMutation({
    mutationFn: ({
      schedule,
      subjectName,
      input,
    }: {
      schedule: ClassSchedule;
      subjectName: string;
      input: ClassScheduleInput;
    }) => updateClassSchedule(schedule, subjectName, input),
    onSuccess: () => {
      setEditingScheduleId(null);
      invalidate();
    },
  });
  const deleteScheduleMutation = useMutation({
    mutationFn: (schedule: ClassSchedule) => deleteClassSchedule(schedule),
    onSuccess: invalidate,
  });

  const logSessionMutation = useMutation({
    mutationFn: ({ subjectId, minutes, sessionDate }: { subjectId: string; minutes: number; sessionDate?: string }) =>
      logStudySession(userId!, subjectId, minutes, sessionDate),
    onSuccess: invalidate,
  });
  const undoSessionMutation = useMutation({
    mutationFn: (id: string) => undoLastStudySession(id),
    onSuccess: invalidate,
  });
  const updateSessionMutation = useMutation({
    mutationFn: ({ id, subjectId, minutes }: { id: string; subjectId: string; minutes: number }) =>
      updateStudySession(id, subjectId, minutes),
    onSuccess: invalidate,
  });

  const createTaskMutation = useMutation({
    mutationFn: (input: StudyTaskInput) => createStudyTask(userId!, input),
    onSuccess: () => {
      setShowTaskForm(false);
      invalidate();
    },
  });
  const updateTaskMutation = useMutation({
    mutationFn: ({ task, input }: { task: StudyTask; input: StudyTaskInput }) => updateStudyTask(task, input),
    onSuccess: () => {
      setEditingTaskId(null);
      invalidate();
    },
  });
  const deleteTaskMutation = useMutation({
    mutationFn: (task: StudyTask) => deleteStudyTask(task),
    onSuccess: invalidate,
  });
  const toggleTaskMutation = useMutation({
    mutationFn: ({ task, done }: { task: StudyTask; done: boolean }) => toggleStudyTaskDone(task, done),
    onSuccess: invalidate,
  });

  const nextSubjectColor = SUBJECT_COLOR_KEYS[subjects.length % SUBJECT_COLOR_KEYS.length];

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 32 }}>🎓</Text>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>Estudos</Text>
        <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
          Matérias com horário de aula, sessões de estudo e tarefas com prazo.
        </Text>
      </View>

      {query.isLoading ? (
        <ActivityIndicator color={tokens.accent} />
      ) : query.isError ? (
        <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
          Não deu pra carregar seus Estudos agora. Puxe pra atualizar ou tente de novo em instantes.
        </Text>
      ) : (
        <View style={{ gap: 20 }}>
          <View style={{ gap: 12 }}>
            <StatCard
              label="Estudado nos últimos 7 dias"
              value={formatMinutes(minutesLast7Days)}
              deltaLabel={metaMinutosSemana ? `meta ${formatMinutes(metaMinutosSemana)}` : undefined}
              deltaTone={
                metaMinutosSemana
                  ? minutesLast7Days >= metaMinutosSemana
                    ? "positive"
                    : "neutral"
                  : "neutral"
              }
            >
              <WeeklyBarChart data={weeklyMinutes} highlightIndex={6} />
            </StatCard>

            {streak > 0 ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.warning }}>
                  🔥 {streak} {streak === 1 ? "dia seguido" : "dias seguidos"} estudando
                </Text>
                {milestone ? (
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11.5, color: tokens.success }}>
                    · 🏅 marco de {milestone} dias
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={{ gap: 8 }}>
              <MonthNav monthDate={historyMonth} onChange={setHistoryMonth} />
              <MonthHeatmap
                monthDate={historyMonth}
                showMonthLabel={false}
                getCellColor={(dateStr) => {
                  const minutes = computeDayMinutes(dateStr, heatmapSessions);
                  if (minutes <= 0) return null;
                  if (metaMinutosSemana) {
                    const ratio = minutes / (metaMinutosSemana / 7);
                    if (ratio >= 1) return tokens.accent;
                    return tokens.accentMuted;
                  }
                  return tokens.accent;
                }}
              />
            </View>

            {subjectBreakdown.length > 0 ? (
              <View
                style={{
                  backgroundColor: tokens.surface,
                  borderColor: tokens.border,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 14,
                  gap: 12,
                }}
              >
                <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                  Tempo por matéria
                </Text>
                <CategoryDonut items={subjectBreakdown} />
              </View>
            ) : null}
          </View>

          <SessionLogger
            subjects={subjects}
            onLog={(subjectId, minutes) => logSessionMutation.mutate({ subjectId, minutes })}
            isLogging={logSessionMutation.isPending}
            onUndo={() => lastSession && undoSessionMutation.mutate(lastSession.id)}
            isUndoing={undoSessionMutation.isPending}
            hasSessionToUndo={!!lastSession}
            colorFor={colorFor}
            lastSession={lastSession ?? null}
            onUpdateLast={(subjectId, minutes) =>
              lastSession && updateSessionMutation.mutate({ id: lastSession.id, subjectId, minutes })
            }
            isUpdatingLast={updateSessionMutation.isPending}
          />

          {/* Antes só a última sessão registrada dava pra corrigir;
              qualquer sessão mais antiga do mês selecionado ficava só como número agregado
              no calendário, sem poder ser vista/editada/excluída individualmente. */}
          {heatmapSessions.length > 0 ? (
            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 14, color: tokens.text }}>
                Sessões do mês
              </Text>
              <View style={{ backgroundColor: tokens.surface, borderColor: tokens.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 }}>
                {[...heatmapSessions]
                  .sort((a, b) => (a.session_date < b.session_date ? 1 : a.session_date > b.session_date ? -1 : 0))
                  .map((session, index) => (
                    <View
                      key={session.id}
                      style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: tokens.border }}
                    >
                      <SessionHistoryRow
                        session={session}
                        subjects={subjects}
                        colorFor={colorFor}
                        onUpdate={(subjectId, minutes) =>
                          updateSessionMutation.mutate({ id: session.id, subjectId, minutes })
                        }
                        isSaving={updateSessionMutation.isPending && updateSessionMutation.variables?.id === session.id}
                        onDelete={() => undoSessionMutation.mutate(session.id)}
                        isDeleting={undoSessionMutation.isPending && undoSessionMutation.variables === session.id}
                      />
                    </View>
                  ))}
              </View>
            </View>
          ) : null}

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                Matérias
              </Text>
            </View>

            {subjects.length === 0 && !showSubjectForm ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                Nenhuma matéria cadastrada ainda.
              </Text>
            ) : null}

            <View style={{ gap: 8 }}>
              {subjects.map((subject) => (
                <SubjectRow
                  key={subject.id}
                  subject={subject}
                  isEditing={editingSubjectId === subject.id}
                  onStartEdit={() => setEditingSubjectId(subject.id)}
                  onCancelEdit={() => setEditingSubjectId(null)}
                  onUpdate={(name, colorKey) => updateSubjectMutation.mutate({ id: subject.id, name, colorKey })}
                  onDelete={() => deleteSubjectMutation.mutate(subject.id)}
                  colorFor={colorFor}
                />
              ))}
            </View>

            {showSubjectForm ? (
              <NewSubjectForm
                isSaving={createSubjectMutation.isPending}
                onCancel={() => setShowSubjectForm(false)}
                onSubmit={(name, colorKey) => createSubjectMutation.mutate({ name, colorKey })}
                colorFor={colorFor}
                suggestedColor={nextSubjectColor}
              />
            ) : (
              <Pressable
                onPress={() => setShowSubjectForm(true)}
                style={{
                  borderColor: tokens.border,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
                  + Nova matéria
                </Text>
              </Pressable>
            )}
          </View>

          <View style={{ gap: 10 }}>
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
              Horário de aulas
            </Text>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
              Pra quem é universitário — cadastre os horários fixos de cada matéria e receba lembrete antes da aula.
            </Text>

            {schedules.length === 0 && !showScheduleForm ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                Nenhum horário cadastrado ainda.
              </Text>
            ) : null}

            {weekdaysWithClasses.map((weekday) => (
              <View key={weekday} style={{ gap: 8 }}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
                  {WEEKDAY_FULL_LABELS[weekday]}
                </Text>
                {schedulesForWeekday(schedules, weekday).map((schedule) => (
                  <ClassScheduleRow
                    key={schedule.id}
                    schedule={schedule}
                    subject={subjects.find((s) => s.id === schedule.subject_id)}
                    subjects={subjects}
                    isEditing={editingScheduleId === schedule.id}
                    onStartEdit={() => setEditingScheduleId(schedule.id)}
                    onCancelEdit={() => setEditingScheduleId(null)}
                    onUpdate={(subjectId, input) =>
                      updateScheduleMutation.mutate({ schedule, subjectName: subjectNameFor(subjectId), input })
                    }
                    isSaving={updateScheduleMutation.isPending}
                    onDelete={() => deleteScheduleMutation.mutate(schedule)}
                    colorFor={colorFor}
                    onMarkDone={(minutes, sessionDate) =>
                      logSessionMutation.mutate({ subjectId: schedule.subject_id, minutes, sessionDate })
                    }
                    isMarkingDone={logSessionMutation.isPending}
                  />
                ))}
              </View>
            ))}

            {showScheduleForm ? (
              <NewClassScheduleForm
                subjects={subjects}
                isSaving={createScheduleMutation.isPending}
                onCancel={() => setShowScheduleForm(false)}
                onSubmit={(subjectId, input) =>
                  createScheduleMutation.mutate({ subjectId, subjectName: subjectNameFor(subjectId), input })
                }
                colorFor={colorFor}
              />
            ) : subjects.length > 0 ? (
              <Pressable
                onPress={() => setShowScheduleForm(true)}
                style={{
                  borderColor: tokens.border,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
                  + Novo horário de aula
                </Text>
              </Pressable>
            ) : (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 12.5, color: tokens.textMuted }}>
                Cadastre uma matéria acima pra poder adicionar horário de aula.
              </Text>
            )}
          </View>

          <View style={{ gap: 10 }}>
            <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
              Tarefas e provas
            </Text>

            {tasks.length === 0 && !showTaskForm ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                Nenhuma tarefa ou prova cadastrada ainda.
              </Text>
            ) : null}

            {tasks.length > 5 ? (
              <SearchInput value={taskSearch} onChangeText={setTaskSearch} placeholder="Buscar tarefa ou prova" />
            ) : null}

            {tasks.length > 0 && taskSearchTerm.length > 0 && pendingTasks.length === 0 && doneTasks.length === 0 ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                Nenhuma tarefa encontrada.
              </Text>
            ) : null}

            {pendingTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                subject={subjects.find((s) => s.id === task.subject_id)}
                subjects={subjects}
                isEditing={editingTaskId === task.id}
                onStartEdit={() => setEditingTaskId(task.id)}
                onCancelEdit={() => setEditingTaskId(null)}
                onUpdate={(input) => updateTaskMutation.mutate({ task, input })}
                isSaving={updateTaskMutation.isPending}
                onDelete={() => deleteTaskMutation.mutate(task)}
                onToggleDone={() => toggleTaskMutation.mutate({ task, done: !task.done })}
                colorFor={colorFor}
              />
            ))}

            {showTaskForm ? (
              <NewTaskForm
                subjects={subjects}
                isSaving={createTaskMutation.isPending}
                onCancel={() => setShowTaskForm(false)}
                onSubmit={(input) => createTaskMutation.mutate(input)}
                colorFor={colorFor}
              />
            ) : (
              <Pressable
                onPress={() => setShowTaskForm(true)}
                style={{
                  borderColor: tokens.border,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
                  + Nova tarefa ou prova
                </Text>
              </Pressable>
            )}

            {doneTasks.length > 0 ? (
              <View style={{ gap: 8, marginTop: 6 }}>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
                  Concluídas · {doneTasks.length}
                </Text>
                {doneTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    subject={subjects.find((s) => s.id === task.subject_id)}
                    subjects={subjects}
                    isEditing={editingTaskId === task.id}
                    onStartEdit={() => setEditingTaskId(task.id)}
                    onCancelEdit={() => setEditingTaskId(null)}
                    onUpdate={(input) => updateTaskMutation.mutate({ task, input })}
                    isSaving={updateTaskMutation.isPending}
                    onDelete={() => deleteTaskMutation.mutate(task)}
                    onToggleDone={() => toggleTaskMutation.mutate({ task, done: !task.done })}
                    colorFor={colorFor}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}

export default function EstudosScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(TABS[0].key);

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
            ← Voltar
          </Text>
        </Pressable>

        {/* Sem cabeçalho próprio aqui — cada aba (`EstudosContent`/`BibliotecaContent`) já
           mostra seu próprio ícone/título/descrição, então um segundo cabeçalho fixo do
           hub só duplicava a mesma informação. */}
        <ModuleTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        <View style={{ marginTop: 16 }}>
          {activeTab === "biblioteca" ? <BibliotecaContent /> : <EstudosContent />}
        </View>
      </View>
    </Screen>
  );
}
