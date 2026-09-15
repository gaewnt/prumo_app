import React, { useState } from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { CareerGoalCard } from "@/components/carreira/career-goal-card";
import { NewCareerGoalForm } from "@/components/carreira/new-career-goal-form";
import { CourseRow } from "@/components/carreira/course-row";
import { NewCourseForm } from "@/components/carreira/new-course-form";
import { DeadlineRow } from "@/components/carreira/deadline-row";
import { NewDeadlineForm } from "@/components/carreira/new-deadline-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { fontFamily } from "@/lib/theme/tokens";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchCarreira,
  createCareerGoal,
  updateCareerGoal,
  toggleCareerGoalCompleted,
  deleteCareerGoal,
  createCourse,
  updateCourse,
  deleteCourse,
  createCareerDeadline,
  updateCareerDeadline,
  toggleCareerDeadlineDone,
  deleteCareerDeadline,
  type CareerGoal,
  type CareerDeadline,
  type CourseInput,
  type DeadlineInput,
  type GoalInput,
} from "@/lib/carreira";

export default function CarreiraScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);
  const [showDeadlineForm, setShowDeadlineForm] = useState(false);

  const query = useQuery({
    queryKey: ["carreira", userId],
    queryFn: fetchCarreira,
    enabled: !!userId,
  });
  const goals = query.data?.goals ?? [];
  const courses = query.data?.courses ?? [];
  const deadlines = query.data?.deadlines ?? [];
  const pendingDeadlines = deadlines.filter((d) => !d.done);
  const doneDeadlines = deadlines.filter((d) => d.done);

  // Busca nos cursos — a lista de cursos/certificados só cresce com o tempo.
  const [courseSearch, setCourseSearch] = useState("");
  const courseSearchTerm = courseSearch.trim().toLowerCase();
  const filteredCourses =
    courseSearchTerm.length === 0
      ? courses
      : courses.filter(
          (c) =>
            c.title.toLowerCase().includes(courseSearchTerm) ||
            (c.institution ?? "").toLowerCase().includes(courseSearchTerm) ||
            (c.notes ?? "").toLowerCase().includes(courseSearchTerm)
        );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["carreira", userId] });
  }

  const createGoalMutation = useMutation({
    mutationFn: (input: GoalInput) => createCareerGoal(userId!, input),
    onSuccess: () => {
      setShowGoalForm(false);
      invalidate();
    },
  });
  const updateGoalMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: GoalInput }) => updateCareerGoal(id, input),
    onSuccess: () => {
      setEditingGoalId(null);
      invalidate();
    },
  });
  const toggleGoalMutation = useMutation({
    mutationFn: (goal: CareerGoal) => toggleCareerGoalCompleted(goal),
    onSuccess: invalidate,
  });
  const deleteGoalMutation = useMutation({
    mutationFn: (id: string) => deleteCareerGoal(id),
    onSuccess: invalidate,
  });

  const createCourseMutation = useMutation({
    mutationFn: (input: CourseInput) => createCourse(userId!, input),
    onSuccess: () => {
      setShowCourseForm(false);
      invalidate();
    },
  });
  const updateCourseMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CourseInput }) => updateCourse(id, input),
    onSuccess: () => {
      setEditingCourseId(null);
      invalidate();
    },
  });
  const deleteCourseMutation = useMutation({
    mutationFn: (id: string) => deleteCourse(id),
    onSuccess: invalidate,
  });

  const createDeadlineMutation = useMutation({
    mutationFn: (input: DeadlineInput) => createCareerDeadline(userId!, input),
    onSuccess: () => {
      setShowDeadlineForm(false);
      invalidate();
    },
  });
  const updateDeadlineMutation = useMutation({
    mutationFn: ({ deadline, input }: { deadline: CareerDeadline; input: DeadlineInput }) => updateCareerDeadline(deadline, input),
    onSuccess: () => {
      setEditingDeadlineId(null);
      invalidate();
    },
  });
  const toggleDeadlineMutation = useMutation({
    mutationFn: ({ deadline, done }: { deadline: CareerDeadline; done: boolean }) => toggleCareerDeadlineDone(deadline, done),
    onSuccess: invalidate,
  });
  const deleteDeadlineMutation = useMutation({
    mutationFn: (deadline: CareerDeadline) => deleteCareerDeadline(deadline),
    onSuccess: invalidate,
  });

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>← Voltar</Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32 }}>💼</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 26, color: tokens.text }}>Carreira</Text>
          <Text style={{ fontFamily: fontFamily.body, fontSize: 15, color: tokens.textMuted }}>
            Metas de carreira, cursos e prazos importantes.
          </Text>
        </View>

        {query.isLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : query.isError ? (
          <Text style={{ fontFamily: fontFamily.body, fontSize: 14, color: tokens.danger }}>
            Não deu pra carregar seus dados de Carreira agora. Puxe pra atualizar ou tente de novo em instantes.
          </Text>
        ) : (
          <View style={{ gap: 24 }}>
            {/* Metas */}
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>Metas</Text>

              {goals.length === 0 && !showGoalForm ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhuma meta cadastrada ainda.
                </Text>
              ) : null}

              {goals.map((goal) => (
                <CareerGoalCard
                  key={goal.id}
                  goal={goal}
                  isEditing={editingGoalId === goal.id}
                  onStartEdit={() => setEditingGoalId(goal.id)}
                  onCancelEdit={() => setEditingGoalId(null)}
                  onUpdate={(input) => updateGoalMutation.mutate({ id: goal.id, input })}
                  isSaving={updateGoalMutation.isPending}
                  onToggleCompleted={() => toggleGoalMutation.mutate(goal)}
                  onDelete={() => deleteGoalMutation.mutate(goal.id)}
                />
              ))}

              {showGoalForm ? (
                <NewCareerGoalForm
                  isSaving={createGoalMutation.isPending}
                  onCancel={() => setShowGoalForm(false)}
                  onSubmit={(input) => createGoalMutation.mutate(input)}
                />
              ) : (
                <Pressable
                  onPress={() => setShowGoalForm(true)}
                  style={{ borderColor: tokens.border, borderWidth: 1, borderStyle: "dashed", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
                >
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>+ Nova meta</Text>
                </Pressable>
              )}
            </View>

            {/* Cursos */}
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                Cursos e certificações
              </Text>

              {courses.length === 0 && !showCourseForm ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhum curso cadastrado ainda.
                </Text>
              ) : null}

              {courses.length > 5 ? (
                <SearchInput
                  value={courseSearch}
                  onChangeText={setCourseSearch}
                  placeholder="Buscar por curso ou instituição"
                />
              ) : null}

              {courses.length > 0 && courseSearchTerm.length > 0 && filteredCourses.length === 0 ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhum curso encontrado.
                </Text>
              ) : null}

              {filteredCourses.map((course) => (
                <CourseRow
                  key={course.id}
                  course={course}
                  isEditing={editingCourseId === course.id}
                  onStartEdit={() => setEditingCourseId(course.id)}
                  onCancelEdit={() => setEditingCourseId(null)}
                  onUpdate={(input) => updateCourseMutation.mutate({ id: course.id, input })}
                  isSaving={updateCourseMutation.isPending}
                  onDelete={() => deleteCourseMutation.mutate(course.id)}
                />
              ))}

              {showCourseForm ? (
                <NewCourseForm
                  isSaving={createCourseMutation.isPending}
                  onCancel={() => setShowCourseForm(false)}
                  onSubmit={(input) => createCourseMutation.mutate(input)}
                />
              ) : (
                <Pressable
                  onPress={() => setShowCourseForm(true)}
                  style={{ borderColor: tokens.border, borderWidth: 1, borderStyle: "dashed", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
                >
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>+ Novo curso</Text>
                </Pressable>
              )}
            </View>

            {/* Prazos importantes */}
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 16, color: tokens.text }}>
                Prazos importantes
              </Text>

              {deadlines.length === 0 && !showDeadlineForm ? (
                <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: tokens.textMuted }}>
                  Nenhum prazo cadastrado ainda.
                </Text>
              ) : null}

              {pendingDeadlines.map((deadline) => (
                <DeadlineRow
                  key={deadline.id}
                  deadline={deadline}
                  isEditing={editingDeadlineId === deadline.id}
                  onStartEdit={() => setEditingDeadlineId(deadline.id)}
                  onCancelEdit={() => setEditingDeadlineId(null)}
                  onUpdate={(input) => updateDeadlineMutation.mutate({ deadline, input })}
                  isSaving={updateDeadlineMutation.isPending}
                  onDelete={() => deleteDeadlineMutation.mutate(deadline)}
                  onToggleDone={() => toggleDeadlineMutation.mutate({ deadline, done: !deadline.done })}
                />
              ))}

              {showDeadlineForm ? (
                <NewDeadlineForm
                  isSaving={createDeadlineMutation.isPending}
                  onCancel={() => setShowDeadlineForm(false)}
                  onSubmit={(input) => createDeadlineMutation.mutate(input)}
                />
              ) : (
                <Pressable
                  onPress={() => setShowDeadlineForm(true)}
                  style={{ borderColor: tokens.border, borderWidth: 1, borderStyle: "dashed", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
                >
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 14, color: tokens.accent }}>+ Novo prazo</Text>
                </Pressable>
              )}

              {doneDeadlines.length > 0 ? (
                <View style={{ gap: 8, marginTop: 6 }}>
                  <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: tokens.textMuted }}>
                    Concluídos · {doneDeadlines.length}
                  </Text>
                  {doneDeadlines.map((deadline) => (
                    <DeadlineRow
                      key={deadline.id}
                      deadline={deadline}
                      isEditing={editingDeadlineId === deadline.id}
                      onStartEdit={() => setEditingDeadlineId(deadline.id)}
                      onCancelEdit={() => setEditingDeadlineId(null)}
                      onUpdate={(input) => updateDeadlineMutation.mutate({ deadline, input })}
                      isSaving={updateDeadlineMutation.isPending}
                      onDelete={() => deleteDeadlineMutation.mutate(deadline)}
                      onToggleDone={() => toggleDeadlineMutation.mutate({ deadline, done: !deadline.done })}
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
