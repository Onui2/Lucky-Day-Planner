import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useGetAccount,
  useUpdateAccountName,
  useChangePassword,
  useDeleteAccount,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import {
  UserCircle2, KeyRound, Trash2, Loader2,
  CheckCircle2, AlertTriangle, ShieldCheck, Mail,
  CalendarDays, Crown, Sparkles, ChevronRight,
} from "lucide-react";

const ELEM_COLOR: Record<string, string> = {
  목: "text-green-400", 화: "text-red-400",
  토: "text-yellow-400", 금: "text-gray-300", 수: "text-blue-400",
};

type Tab = "info" | "password" | "delete";

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
        active
          ? "bg-primary/20 text-primary border border-primary/40"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function SuccessMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm">
      <CheckCircle2 className="w-4 h-4 shrink-0" />
      {msg}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      {msg}
    </div>
  );
}

export default function AccountPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { profile, profileReady } = useUser();
  const [tab, setTab] = useState<Tab>("info");

  const { data: account, isLoading: accountLoading } = useGetAccount();
  const updateName = useUpdateAccountName();
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();

  const [name, setName] = useState("");
  const [nameMsg, setNameMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [delPw, setDelPw] = useState("");
  const [delConfirm, setDelConfirm] = useState("");
  const [delMsg, setDelMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (account?.firstName) setName(account.firstName);
  }, [account]);

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    setNameMsg(null);
    try {
      await updateName.mutateAsync(name);
      setNameMsg({ type: "ok", text: "이름이 변경되었습니다." });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "이름 변경에 실패했습니다.";
      setNameMsg({ type: "err", text: msg });
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPw.length < 6) { setPwMsg({ type: "err", text: "새 비밀번호는 6자 이상이어야 합니다." }); return; }
    if (newPw !== newPw2) { setPwMsg({ type: "err", text: "새 비밀번호가 일치하지 않습니다." }); return; }
    try {
      await changePassword.mutateAsync({ currentPassword: account?.hasPassword ? curPw : undefined, newPassword: newPw });
      setPwMsg({ type: "ok", text: "비밀번호가 변경되었습니다." });
      setCurPw(""); setNewPw(""); setNewPw2("");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "비밀번호 변경에 실패했습니다.";
      setPwMsg({ type: "err", text: msg });
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setDelMsg(null);
    if (delConfirm !== "탈퇴합니다") { setDelMsg({ type: "err", text: '"탈퇴합니다" 를 정확히 입력해주세요.' }); return; }
    try {
      await deleteAccount.mutateAsync(account?.hasPassword ? delPw : undefined);
      logout();
      navigate("/");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "탈퇴 처리에 실패했습니다.";
      setDelMsg({ type: "err", text: msg });
    }
  }

  if (authLoading || accountLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const joinDate = account?.createdAt
    ? new Date(account.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <motion.div
      className="max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-8 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
          <UserCircle2 className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold text-gradient-gold">회원정보 관리</h1>
          <p className="text-sm text-muted-foreground mt-0.5">계정 정보를 확인하고 수정하세요</p>
        </div>
      </div>

      {/* 계정 요약 카드 */}
      <div className="glass-panel rounded-2xl border border-primary/20 p-5 mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-2.5">
          <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">이메일</p>
            <p className="text-sm font-medium text-foreground truncate max-w-[160px]">{account?.email ?? "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">가입일</p>
            <p className="text-sm font-medium text-foreground">{joinDate ?? "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 col-span-2 md:col-span-1">
          {account?.role === "superadmin" ? (
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
          ) : account?.role === "admin" ? (
            <Crown className="w-4 h-4 text-primary shrink-0" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">등급</p>
            <p className={`text-sm font-medium ${account?.role === "superadmin" ? "text-amber-400" : account?.role === "admin" ? "text-primary" : "text-foreground"}`}>
              {account?.role === "superadmin" ? "최고관리자" : account?.role === "admin" ? "관리자" : "일반 회원"}
            </p>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6 p-1 rounded-2xl bg-white/5 border border-primary/10">
        <TabBtn active={tab === "info"} onClick={() => setTab("info")}>
          <span className="flex items-center gap-2"><UserCircle2 className="w-3.5 h-3.5" />내 정보</span>
        </TabBtn>
        <TabBtn active={tab === "password"} onClick={() => setTab("password")}>
          <span className="flex items-center gap-2"><KeyRound className="w-3.5 h-3.5" />비밀번호 변경</span>
        </TabBtn>
        <TabBtn active={tab === "delete"} onClick={() => setTab("delete")}>
          <span className="flex items-center gap-2 text-destructive/80"><Trash2 className="w-3.5 h-3.5" />회원 탈퇴</span>
        </TabBtn>
      </div>

      {/* 내 정보 탭 */}
      {tab === "info" && (
        <motion.div key="info" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
          <div className="glass-panel rounded-2xl border border-primary/20 p-6">
            <h2 className="font-serif text-lg font-semibold mb-5 text-foreground">기본 정보</h2>
            <form onSubmit={handleNameSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">이메일</Label>
                <Input
                  value={account?.email ?? ""}
                  readOnly
                  disabled
                  className="bg-input/20 border-primary/15 text-muted-foreground cursor-not-allowed"
                />
                <p className="text-[11px] text-muted-foreground">이메일은 변경할 수 없습니다.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">이름 (닉네임)</Label>
                <Input
                  placeholder="예) 홍길동"
                  value={name}
                  onChange={e => { setName(e.target.value); setNameMsg(null); }}
                  maxLength={30}
                  className="bg-input/40 border-primary/20"
                />
              </div>
              {nameMsg && (nameMsg.type === "ok" ? <SuccessMsg msg={nameMsg.text} /> : <ErrorMsg msg={nameMsg.text} />)}
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                disabled={updateName.isPending || !name.trim()}
              >
                {updateName.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />저장 중…</> : "이름 저장"}
              </Button>
            </form>
          </div>

          {/* 내 사주 정보 */}
          {profileReady && (
            <div className="glass-panel rounded-2xl border border-primary/20 p-6 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> 내 사주 정보
                </h2>
                <Link href="/saju">
                  <button className="flex items-center gap-1 text-xs text-primary hover:underline">
                    {profile ? "사주 재등록" : "사주 등록하기"} <ChevronRight className="w-3 h-3" />
                  </button>
                </Link>
              </div>
              {profile ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <p className="text-[10px] text-muted-foreground mb-1">이름</p>
                      <p className="font-medium text-foreground">{profile.name || "—"}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <p className="text-[10px] text-muted-foreground mb-1">생년월일</p>
                      <p className="font-medium text-foreground">
                        {profile.birthYear}년 {profile.birthMonth}월 {profile.birthDay}일
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <p className="text-[10px] text-muted-foreground mb-1">성별 · 달력</p>
                      <p className="font-medium text-foreground">
                        {profile.gender === "male" ? "남성" : "여성"} · {profile.calendarType === "solar" ? "양력" : "음력"}
                      </p>
                    </div>
                    {profile.dayMasterElement && (
                      <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <p className="text-[10px] text-muted-foreground mb-1">일간 오행</p>
                        <p className={`font-bold font-serif text-base ${ELEM_COLOR[profile.dayMasterElement] ?? ""}`}>
                          {profile.dayMasterStem} ({profile.dayMasterElement})
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ※ 사주를 재등록하려면 사주 분석 페이지에서 생년월일시를 입력 후 저장하세요.
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <Sparkles className="w-10 h-10 text-primary/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    사주를 등록하면 만세력, 오늘의 일진 등에서 개인화 분석을 받을 수 있습니다.
                  </p>
                  <Link href="/saju">
                    <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
                      지금 사주 등록하기
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* 비밀번호 변경 탭 */}
      {tab === "password" && (
        <motion.div key="password" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
          <div className="glass-panel rounded-2xl border border-primary/20 p-6">
            <h2 className="font-serif text-lg font-semibold mb-1 text-foreground">비밀번호 변경</h2>
            <p className="text-sm text-muted-foreground mb-5">비밀번호는 6자 이상으로 설정해주세요.</p>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {account?.hasPassword && (
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">현재 비밀번호</Label>
                  <Input
                    type="password"
                    placeholder="현재 비밀번호"
                    value={curPw}
                    onChange={e => { setCurPw(e.target.value); setPwMsg(null); }}
                    className="bg-input/40 border-primary/20"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">새 비밀번호</Label>
                <Input
                  type="password"
                  placeholder="새 비밀번호 (6자 이상)"
                  value={newPw}
                  onChange={e => { setNewPw(e.target.value); setPwMsg(null); }}
                  className="bg-input/40 border-primary/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">새 비밀번호 확인</Label>
                <Input
                  type="password"
                  placeholder="새 비밀번호를 한 번 더 입력"
                  value={newPw2}
                  onChange={e => { setNewPw2(e.target.value); setPwMsg(null); }}
                  className="bg-input/40 border-primary/20"
                />
              </div>
              {newPw && newPw2 && newPw !== newPw2 && (
                <p className="text-xs text-destructive">비밀번호가 일치하지 않습니다.</p>
              )}
              {pwMsg && (pwMsg.type === "ok" ? <SuccessMsg msg={pwMsg.text} /> : <ErrorMsg msg={pwMsg.text} />)}
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                disabled={changePassword.isPending || !newPw || !newPw2}
              >
                {changePassword.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />변경 중…</> : "비밀번호 변경"}
              </Button>
            </form>
          </div>
        </motion.div>
      )}

      {/* 회원 탈퇴 탭 */}
      {tab === "delete" && (
        <motion.div key="delete" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
          <div className="glass-panel rounded-2xl border border-destructive/30 p-6 bg-destructive/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center border border-destructive/30">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-semibold text-foreground">회원 탈퇴</h2>
                <p className="text-xs text-muted-foreground">이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>

            <div className="my-5 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-muted-foreground space-y-1">
              <p>• 저장된 사주 데이터가 모두 삭제됩니다.</p>
              <p>• 작성한 문의 내역이 삭제됩니다.</p>
              <p>• 이메일과 계정 정보가 완전히 제거됩니다.</p>
              <p>• 탈퇴 후 같은 이메일로 재가입이 가능합니다.</p>
            </div>

            <form onSubmit={handleDelete} className="space-y-4">
              {account?.hasPassword && (
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">비밀번호 확인</Label>
                  <Input
                    type="password"
                    placeholder="현재 비밀번호를 입력해주세요"
                    value={delPw}
                    onChange={e => { setDelPw(e.target.value); setDelMsg(null); }}
                    className="bg-input/40 border-destructive/20"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">
                  확인을 위해 <span className="text-destructive font-semibold">탈퇴합니다</span>를 입력해주세요
                </Label>
                <Input
                  placeholder="탈퇴합니다"
                  value={delConfirm}
                  onChange={e => { setDelConfirm(e.target.value); setDelMsg(null); }}
                  className="bg-input/40 border-destructive/20"
                />
              </div>
              {delMsg && (delMsg.type === "ok" ? <SuccessMsg msg={delMsg.text} /> : <ErrorMsg msg={delMsg.text} />)}
              <Button
                type="submit"
                variant="destructive"
                className="font-medium"
                disabled={deleteAccount.isPending || delConfirm !== "탈퇴합니다"}
              >
                {deleteAccount.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />처리 중…</> : "회원 탈퇴하기"}
              </Button>
            </form>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
