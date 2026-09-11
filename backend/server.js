const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "../frontend")));

const DB_FILE = path.join(__dirname, "db.json");


function readDB() {

  if (!fs.existsSync(DB_FILE)) {

    return {
      usuarios: [],
      pacientes: [],
      triagens: [],
      consultas: [],
      altas: [],
      tv_chamada: null,
      tv_historico: []
    };

  }

  const db =
    JSON.parse(
      fs.readFileSync(DB_FILE, "utf8")
    );

  // Garante que as estruturas existam
  if (!db.usuarios) db.usuarios = [];
  if (!db.pacientes) db.pacientes = [];
  if (!db.triagens) db.triagens = [];
  if (!db.consultas) db.consultas = [];
  if (!db.altas) db.altas = [];

  if (!db.tv_chamada)
    db.tv_chamada = null;

  if (!db.tv_historico)
    db.tv_historico = [];

  return db;
}


function writeDB(data) {

  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(data, null, 2)
  );

}


/* =========================================================
   LOGIN
========================================================= */

app.post("/login", (req, res) => {

  const db = readDB();

  const user = db.usuarios.find(u =>
    u.usuario === req.body.usuario &&
    u.senha === req.body.senha
  );

  if (!user) {

    return res.status(401).json({
      erro: "Login inválido"
    });

  }

  res.json(user);

});


/* =========================================================
   ATENDIMENTO - CADASTRAR PACIENTE
========================================================= */

app.post("/atendimento", (req, res) => {

  const db = readDB();

  const paciente = {

    id: Date.now(),

    nome:
      req.body.nome,

    cpf:
      req.body.cpf,

    data:
      req.body.data,

    sexo:
      req.body.sexo,

    telefone:
      req.body.telefone,

    tipo:
      req.body.tipo,

    convenio:
      req.body.convenio,

    numeroCarteirinha:
      req.body.numeroCarteirinha,

    motivo:
      req.body.motivo,

    observacoes:
      req.body.observacoes,

    status:
      "triagem",

    createdAt:
      new Date().toISOString()

  };


  db.pacientes.push(paciente);

  writeDB(db);

  res.status(201).json(paciente);

});


/* =========================================================
   LISTAR PACIENTES
========================================================= */

app.get("/pacientes", (req, res) => {

  const db = readDB();

  res.json(db.pacientes);

});


/* =========================================================
   TRIAGEM
========================================================= */

app.post("/triagem", (req, res) => {

  const db = readDB();

  const pacienteId =
    Number(req.body.pacienteId);


  if (!pacienteId) {

    return res.status(400).json({
      erro: "Paciente não informado."
    });

  }


  const paciente =
    db.pacientes.find(
      p =>
        Number(p.id) === pacienteId
    );


  if (!paciente) {

    return res.status(404).json({
      erro: "Paciente não encontrado."
    });

  }


  if (
    paciente.status !== "triagem"
  ) {

    return res.status(409).json({
      erro:
        "Este paciente não está aguardando triagem."
    });

  }


  let risco =
    req.body.risco;


  const temperatura =
    Number(req.body.temperatura);


  if (temperatura >= 39) {

    risco = "vermelho";

  }

  else if (temperatura >= 38) {

    risco = "amarelo";

  }

  else if (!risco) {

    risco = "verde";

  }


  const triagem = {

    id:
      Date.now(),

    pacienteId:
      paciente.id,

    nome:
      paciente.nome,

    cpf:
      paciente.cpf,

    sintoma:
      req.body.sintoma || "",

    temperatura:
      temperatura,

    alergia:
      req.body.alergia || "",

    observacao:
      req.body.observacao || "",

    risco:
      risco,

    status:
      "aguardando_medico",

    createdAt:
      new Date().toISOString()

  };


  db.triagens.push(triagem);


  paciente.status =
    "aguardando_medico";


  writeDB(db);


  console.log(
    "TRIAGEM SALVA:",
    JSON.stringify(
      triagem,
      null,
      2
    )
  );


  console.log(
    "PACIENTE AGUARDANDO MÉDICO:",
    paciente.nome,
    paciente.id,
    paciente.status
  );


  res.status(201).json({

    mensagem:
      "Triagem salva com sucesso.",

    triagem

  });

});


/* =========================================================
   LISTAR TRIAGENS AGUARDANDO MÉDICO
========================================================= */

app.get("/triagens", (req, res) => {

  const db = readDB();

  const triagensAguardando =
    db.triagens.filter(
      t =>
        t.status ===
        "aguardando_medico"
    );


  console.log(
    "TRIAGENS AGUARDANDO MÉDICO:",
    triagensAguardando
  );


  res.json(
    triagensAguardando
  );

});


/* =========================================================
   TV - CHAMAR PACIENTE
========================================================= */

app.post("/tv/chamar", (req, res) => {

  const db = readDB();

  const chamada = {

    id:
      Date.now().toString(),

    localTipo:
      req.body.localTipo,

    localNumero:
      req.body.localNumero,

    paciente:
      req.body.paciente,

    hora:
      new Date().toLocaleTimeString(
        "pt-BR",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      )

  };


  db.tv_chamada =
    chamada;


  db.tv_historico.unshift(
    chamada
  );


  if (
    db.tv_historico.length > 5
  ) {

    db.tv_historico.pop();

  }


  writeDB(db);

  res.json(chamada);

});


/* =========================================================
   TV - CONSULTAR CHAMADA
========================================================= */

app.get("/tv/chamada", (req, res) => {

  const db = readDB();

  res.json({

    chamada:
      db.tv_chamada,

    historico:
      db.tv_historico

  });

});


/* =========================================================
   LISTA DE MEDICAÇÕES
========================================================= */

app.get(
  "/lista-medicacoes",
  (req, res) => {

    res.json([

      "Dipirona",
      "Paracetamol",
      "Ibuprofeno",
      "Amoxicilina",
      "Azitromicina",
      "Loratadina",
      "Omeprazol",
      "Buscopan",
      "Dramin",
      "Soro fisiológico"

    ]);

  }
);


/* =========================================================
   CONSULTA MÉDICA
========================================================= */

app.post("/consulta", (req, res) => {

  const db = readDB();

  const pacienteId =
    Number(req.body.pacienteId);


  if (!pacienteId) {

    return res.status(400).json({
      erro:
        "Paciente não informado."
    });

  }


  const paciente =
    db.pacientes.find(
      p =>
        Number(p.id) ===
        pacienteId
    );


  if (!paciente) {

    return res.status(404).json({
      erro:
        "Paciente não encontrado."
    });

  }


  /*
    IMPORTANTE:

    A consulta só pode ser salva
    enquanto o paciente estiver
    aguardando atendimento médico.
  */

  if (
    paciente.status !==
    "aguardando_medico"
  ) {

    return res.status(409).json({

      erro:
        "Este paciente não está aguardando atendimento médico."

    });

  }


  const diagnostico =
    req.body.diagnostico || "";


  if (!diagnostico.trim()) {

    return res.status(400).json({

      erro:
        "Informe o diagnóstico."

    });

  }


  const consulta = {

    id:
      Date.now(),

    pacienteId:
      paciente.id,

    paciente:
      paciente.nome,

    diagnostico:
      diagnostico,

    medicacao:
      req.body.medicacao || "",

    obs:
      req.body.obs || "",

    createdAt:
      new Date().toISOString()

  };


  /*
    SALVA A CONSULTA
  */

  db.consultas.push(
    consulta
  );


  /*
    IMPORTANTE:

    SALVAR A CONSULTA NÃO DÁ ALTA.

    O paciente fica aguardando_alta.
  */

  paciente.status =
    "aguardando_alta";


  /*
    Atualiza a triagem
    correspondente.
  */

  const triagem =
    db.triagens.find(
      t =>
        Number(t.pacienteId) ===
        pacienteId &&
        t.status ===
        "aguardando_medico"
    );


  if (triagem) {

    triagem.status =
      "aguardando_alta";

  }


  writeDB(db);


  console.log(
    "CONSULTA SALVA:",
    paciente.nome
  );


  console.log(
    "STATUS DO PACIENTE:",
    paciente.status
  );


  res.status(201).json({

    mensagem:
      "Consulta salva. Paciente aguardando alta.",

    consulta

  });

});


/* =========================================================
   ALTA DO PACIENTE
========================================================= */

app.post("/alta", (req, res) => {

  const db = readDB();

  const pacienteId =
    Number(req.body.pacienteId);


  if (!pacienteId) {

    return res.status(400).json({
      erro:
        "Paciente não informado."
    });

  }


  const paciente =
    db.pacientes.find(
      p =>
        Number(p.id) ===
        pacienteId
    );


  if (!paciente) {

    return res.status(404).json({
      erro:
        "Paciente não encontrado."
    });

  }


  /*
    Só pode receber alta
    quem terminou a consulta.
  */

  if (
    paciente.status !==
    "aguardando_alta"
  ) {

    return res.status(409).json({

      erro:
        "Este paciente não está aguardando alta."

    });

  }


  const condicao =
    req.body.condicao || "";


  if (!condicao.trim()) {

    return res.status(400).json({

      erro:
        "Selecione a condição do paciente na alta."

    });

  }


  /*
    Impede alta duplicada.
  */

  const altaExistente =
    db.altas.find(
      a =>
        Number(a.pacienteId) ===
        pacienteId
    );


  if (altaExistente) {

    return res.status(409).json({

      erro:
        "Este paciente já possui uma alta registrada."

    });

  }


  const alta = {

    id:
      Date.now(),

    pacienteId:
      paciente.id,

    paciente:
      paciente.nome,

    condicao:
      condicao,

    orientacoes:
      req.body.orientacoes || "",

    recomendacoes:
      req.body.recomendacoes || "",

    retorno:
      req.body.retorno || "",

    observacoes:
      req.body.observacoes || "",

    createdAt:
      new Date().toISOString()

  };


  /*
    Salva a alta.
  */

  db.altas.push(
    alta
  );


  /*
    AGORA SIM
    o paciente é finalizado.
  */

  paciente.status =
    "finalizado";


  /*
    Atualiza também
    a triagem.
  */

  const triagem =
    db.triagens.find(
      t =>
        Number(t.pacienteId) ===
        pacienteId &&
        t.status ===
        "aguardando_alta"
    );


  if (triagem) {

    triagem.status =
      "finalizado";

  }


  writeDB(db);


  console.log(
    "ALTA REGISTRADA:",
    paciente.nome
  );


  console.log(
    "STATUS FINAL:",
    paciente.status
  );


  res.status(201).json({

    mensagem:
      "Alta registrada com sucesso.",

    alta

  });

});


/* =========================================================
   LISTAR CONSULTAS
========================================================= */

app.get("/medicacoes", (req, res) => {

  const db = readDB();

  res.json(
    db.consultas
  );

});


/* =========================================================
   LISTAR ALTAS
========================================================= */

app.get("/altas", (req, res) => {

  const db = readDB();

  res.json(
    db.altas
  );

});


/* =========================================================
   START
========================================================= */

const PORT =
  process.env.PORT || 3000;


app.listen(
  PORT,
  () => {

    console.log(
      `Porta ${PORT}`
    );

  }
);
