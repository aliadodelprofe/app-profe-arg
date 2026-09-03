import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, DEFAULT_AVATAR_URL } from '../types';
import { formatMemberSinceDate } from '../utils/dateUtils';
import { TALogo } from './TALogo';
import { INITIAL_USERS } from '../data/initialData';

interface PublicMemberVerificationProps {
  memberIdOrCode: string;
  usersList: User[];
  onClose?: () => void;
}

export const PublicMemberVerification: React.FC<PublicMemberVerificationProps> = ({
  memberIdOrCode,
  usersList,
}) => {
  const [member, setMember] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const findMember = async () => {
      setLoading(true);
      const cleanTarget = memberIdOrCode.trim();

      // Combine usersList with INITIAL_USERS to cover all local presets
      const searchPool = [...usersList, ...INITIAL_USERS];

      // 1. Search in local pool first
      let found = searchPool.find(
        (u) =>
          u.id.toLowerCase() === cleanTarget.toLowerCase() ||
          u.memberCode.toLowerCase() === cleanTarget.toLowerCase() ||
          (u.dni && u.dni.trim() === cleanTarget)
      );

      // 2. Fallback to Firestore fetch if not found locally
      if (!found && cleanTarget) {
        try {
          // Direct Doc lookup by ID
          const docRef = doc(db, 'users', cleanTarget);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            found = { id: snap.id, ...snap.data() } as User;
          } else {
            // Search by memberCode in Firestore
            const qCode = query(collection(db, 'users'), where('memberCode', '==', cleanTarget));
            const snapCode = await getDocs(qCode);
            if (!snapCode.empty) {
              const d = snapCode.docs[0];
              found = { id: d.id, ...d.data() } as User;
            } else {
              // Search by DNI in Firestore
              const qDni = query(collection(db, 'users'), where('dni', '==', cleanTarget));
              const snapDni = await getDocs(qDni);
              if (!snapDni.empty) {
                const d = snapDni.docs[0];
                found = { id: d.id, ...d.data() } as User;
              }
            }
          }
        } catch (err) {
          console.warn('Error fetching member for verification:', err);
        }
      }

      if (isMounted) {
        setMember(found || null);
        setLoading(false);
      }
    };

    findMember();
    return () => {
      isMounted = false;
    };
  }, [memberIdOrCode, usersList]);

  const nowFormatted = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0a0a0a]/90 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#111111] border-2 border-[#e7d9cf]/40 rounded-3xl p-5 sm:p-8 shadow-2xl text-[#eeede9] space-y-6 my-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#56554e]/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#56554e]/30 border border-[#e7d9cf]/30">
              <TALogo className="h-7 w-auto" glow />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg text-[#eeede9] uppercase tracking-wide">
                Verificación de Socio
              </h2>
              <p className="text-xs text-[#e7d9cf]">TA BACHATA ACADEMY</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-[#e7d9cf] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-[#e7d9cf]">Verificando credencial en la base de datos...</p>
          </div>
        ) : member ? (
          (() => {
            const isMemberPaused = Boolean(
              member.isPaused ||
              (member as any).status === 'paused' ||
              usersList.some(u => u.id === member.id && u.isPaused)
            );

            return (
              <div className="space-y-6">
                {/* Status Banner */}
                {isMemberPaused ? (
                  <div className="p-4 rounded-2xl bg-rose-950/50 border-2 border-rose-500/60 flex items-center gap-3 text-rose-300 shadow-lg animate-fadeIn">
                    <div className="p-2 rounded-xl bg-rose-500/20 shrink-0 border border-rose-500/40">
                      <XCircle className="w-7 h-7 text-rose-400" />
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider block text-rose-400">
                        Verificación Fallida
                      </span>
                      <span className="text-sm font-black text-white block">
                        No es un socio activo de la comunidad
                      </span>
                      <span className="text-[11px] text-rose-300/80 block mt-0.5 capitalize">
                        {nowFormatted}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-950/40 border-2 border-emerald-500/50 flex items-center gap-3 text-emerald-300 shadow-lg">
                    <div className="p-2 rounded-xl bg-emerald-500/20 shrink-0">
                      <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider block text-emerald-400">
                        Verificación Exitosa
                      </span>
                      <span className="text-sm font-extrabold text-white block">
                        Socio Activo de la Comunidad
                      </span>
                      <span className="text-[11px] text-emerald-300/80 block mt-0.5 capitalize">
                        {nowFormatted}
                      </span>
                    </div>
                  </div>
                )}

                {/* Member Main Card */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-[#1d1c1a] to-[#121110] border border-[#e7d9cf]/30 space-y-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#e7d9cf]/5 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <img
                      src={member.avatarUrl || DEFAULT_AVATAR_URL}
                      alt={member.fullName}
                      referrerPolicy="no-referrer"
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-[#e7d9cf]/60 shadow-xl shrink-0"
                    />

                    <div className="space-y-2 text-center sm:text-left min-w-0 flex-1">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#e7d9cf]/20 text-[#e7d9cf] border border-[#e7d9cf]/40">
                        {member.role === 'admin' ? 'Director de Escuela' : 'Alumno'}
                      </span>

                      <h3 className="text-xl sm:text-2xl font-black text-[#eeede9] tracking-tight">
                        {member.fullName}
                      </h3>

                      <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-[#eeede9]/80">
                        <span className="px-2.5 py-1 rounded-xl bg-[#111111]/80 border border-[#56554e] font-mono font-bold text-[#e7d9cf]">
                          Cod: {member.memberCode}
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-[#111111]/80 border border-[#56554e] font-mono">
                          DNI: {member.dni}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detail Items */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#56554e]/40 text-xs">
                    <div className="p-3 rounded-2xl bg-[#111111]/60 border border-[#56554e]/30">
                      <span className="text-[10px] uppercase font-bold text-[#e7d9cf]/70 block">Socio Desde</span>
                      <span className="font-semibold text-white">{formatMemberSinceDate(member)}</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#111111]/60 border border-[#56554e]/30">
                      <span className="text-[10px] uppercase font-bold text-[#e7d9cf]/70 block">Estado Beneficios</span>
                      {isMemberPaused ? (
                        <span className="font-extrabold text-rose-400 flex items-center gap-1 uppercase">
                          <XCircle className="w-3.5 h-3.5" />
                          INHABILITADO
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Habilitado
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Provider Verification Notice */}
                <div className="p-4 rounded-2xl bg-[#56554e]/20 border border-[#56554e]/40 text-xs text-[#eeede9]/80 space-y-1">
                  <span className="font-bold text-[#e7d9cf] block flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#e7d9cf]" />
                    Información para Proveedores de Beneficios:
                  </span>
                  <p className="leading-relaxed">
                    {isMemberPaused
                      ? 'Esta membresía se encuentra inactiva o pausada. El titular no se encuentra habilitado para acceder a los descuentos ni beneficios de la comunidad.'
                      : 'Esta pantalla confirma que el titular cuenta con una membresía activa en TA BACHATA ACADEMY. Se encuentra autorizado para recibir los descuentos y promociones en beneficios ofrecidos.'}
                  </p>
                </div>
              </div>
            );
          })()
        ) : (
          /* Not found state */
          <div className="space-y-6 text-center py-4">
            <div className="p-4 rounded-2xl bg-rose-950/40 border-2 border-rose-500/50 flex flex-col items-center gap-2 text-rose-300">
              <XCircle className="w-12 h-12 text-rose-400" />
              <span className="text-sm font-black uppercase tracking-wider text-rose-300">
                Socio No Encontrado o Inactivo
              </span>
              <p className="text-xs text-rose-200/80 max-w-sm">
                El código de credencial o DNI escaneado no coincide con ningún registro de socio activo en el sistema oficial de TA BACHATA ACADEMY.
              </p>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="pt-3 flex items-center justify-center border-t border-[#56554e]/40 text-center">
          <span className="text-[11px] text-[#e7d9cf]/70 font-semibold tracking-wide">
            Validación Digital Oficial • TA BACHATA ACADEMY
          </span>
        </div>

      </div>
    </div>
  );
};
