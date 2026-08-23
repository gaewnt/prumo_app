import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { StatCard } from "@/components/ui/stat-card";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { MonthHeatmap } from "@/components/ui/month-heatmap";
import { SessionLogger } from "@/components/estudos/session-logger";
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
  createSubject,
  updateSubject,
  deleteSubject,
  createClassSchedule,
  updateClassSchedule,
  deleteClassSchedule,
  schedulesForWeekday,
  logStudySession,
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

export default function EstudosScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
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

  const pendingTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);

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
    mutationFn: ({ subjectId, minutes }: { subjectId: string; minutes: number }) =>
      logStudySession(userId!, subjectId, minutes),
    onSuccess: invalidate,
  });
  const undoSessionMutation = useMutation({
    mutationFn: (id: string) => undoLastStudySession(id),
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
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>
            ← Voltar
          </Text>
        </Pressable>

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

              {sessions.length > 0 ? (
                <MonthHeatmap
                  monthDate={new Date()}
                  getCellColor={(dateStr) => {
                    const minutes = computeDayMinutes(dateStr, sessions);
                    if (minutes <= 0) return null;
                    if (metaMinutosSemana) {
                      const ratio = minutes / (metaMinutosSemana / 7);
                      if (ratio >= 1) return tokens.accent;
                      return tokens.accentMuted;
                    }
                    return tokens.accent;
                  }}
                />
              ) : null}

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
            />

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
    </Screen>
  );
}
