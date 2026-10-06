import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "../../supabaseClient";
import type { Session } from "@supabase/supabase-js";

export interface PerfilUsuario {
  idusuario: number;
  idempleado: number;
  idrol: number;
  rol: string;
  usuario: string;
  nombreCompleto: string;
}

interface AuthContextValue {
  session: Session | null;
  perfil: PerfilUsuario | null;
  loading: boolean;
  signIn: (usuario: string, pass: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);

  async function cargarPerfil(userId: string) {
    // Trae el usuario + su rol + su empleado en una sola consulta,
    // aprovechando las foreign keys que ya definimos en el SQL.
    const { data, error } = await supabase
      .from("tbusuario")
      .select(
        `
        idusuario,
        idempleado,
        idrol,
        usuario,
        tbrol ( nombre ),
        tbempleado ( nombre, apellido )
        `
      )
      .eq("auth_user_id", userId)
      .eq("estado", true)
      .single();

    if (error || !data) {
      console.error("No se pudo cargar el perfil del usuario:", error);
      setPerfil(null);
      return;
    }

    const rol = Array.isArray(data.tbrol) ? data.tbrol[0] : data.tbrol;
    const empleado = Array.isArray(data.tbempleado)
      ? data.tbempleado[0]
      : data.tbempleado;

    setPerfil({
      idusuario: data.idusuario,
      idempleado: data.idempleado,
      idrol: data.idrol,
      usuario: data.usuario,
      rol: rol?.nombre ?? "",
      nombreCompleto: `${empleado?.nombre ?? ""} ${empleado?.apellido ?? ""}`.trim(),
    });
  }

  useEffect(() => {
    // 1. Al montar la app, revisa si ya hay una sesión guardada
    //    (Supabase la persiste en localStorage por defecto).
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        cargarPerfil(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 2. Se suscribe a cambios de sesión (login, logout, refresh token).
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          cargarPerfil(newSession.user.id);
        } else {
          setPerfil(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(usuario: string, pass: string) {
    // Paso 1: resolver el correo real a partir del "usuario"
    const { data: correo, error: rpcError } = await supabase.rpc(
      "fn_login_lookup_correo",
      { p_usuario: usuario }
    );

    if (rpcError || !correo) {
      return { error: "Usuario o contraseña incorrectos. 1" };
    }

    // Paso 2: autenticar de verdad con Supabase Auth
    console.log("Intentando iniciar sesión con correo:", correo, "y contraseña:", pass);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: correo,
      password: pass,
    });

    if (authError) {
      return { error: "Usuario o contraseña incorrectos."};
    }

    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, perfil, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de un <AuthProvider>");
  }
  return ctx;
}