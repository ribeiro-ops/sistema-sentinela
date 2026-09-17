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

// ==========================================
// BUSCAR PACIENTE PELO ID
// ==========================================
app.get("/pacientes/:id", (req, res) => {
  const db = readDB();
  const pacienteId = Number(req.params.id);

  const paciente = db.pacientes.find(
    p => Number(p.id) === pacienteId
  );

  if (!paciente) {
    return res.status(404).json({
      erro: "Paciente não encontrado."
    });
  }

  res.json(paciente);
});


// ==========================================
// BUSCAR ÚLTIMA CONSULTA DO PACIENTE
// ==========================================
app.get("/consulta/:pacienteId", (req, res) => {
  const db = readDB();
  const pacienteId = Number(req.params.pacienteId);

  const consultas = db.consultas
    .filter(c => Number(c.pacienteId) === pacienteId)
    .sort((a, b) => Number(b.id) - Number(a.id));

  if (consultas.length === 0) {
    return res.status(404).json({
      erro: "Nenhuma consulta encontrada para este paciente."
    });
  }

  res.json(consultas[0]);
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

  // Mostra na fila tanto quem ainda precisa ser atendido
  // quanto quem já foi atendido e está aguardando alta.
  const triagensFila = db.triagens.filter(
    t =>
      t.status === "aguardando_medico" ||
      t.status === "aguardando_alta"
  );

  res.json(triagensFila);
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


// ==========================================
// REGISTRAR ALTA DO PACIENTE
// ==========================================
app.post("/alta", (req, res) => {
  const db = readDB();

  const {
    pacienteId,
    paciente,
    condicao,
    orientacoes,
    recomendacoes,
    retorno,
    observacoes
  } = req.body;

  const idPaciente = Number(pacienteId);

  if (!idPaciente) {
    return res.status(400).json({
      erro: "Paciente não identificado."
    });
  }

  const pacienteEncontrado = db.pacientes.find(
    p => Number(p.id) === idPaciente
  );

  if (!pacienteEncontrado) {
    return res.status(404).json({
      erro: "Paciente não encontrado."
    });
  }

  if (pacienteEncontrado.status !== "aguardando_alta") {
    return res.status(400).json({
      erro: "Este paciente não está aguardando alta."
    });
  }

  if (!condicao) {
    return res.status(400).json({
      erro: "Informe a condição do paciente na alta."
    });
  }

  // Procura a última consulta do paciente
  const consultasPaciente = db.consultas
    .filter(c => Number(c.pacienteId) === idPaciente)
    .sort((a, b) => Number(b.id) - Number(a.id));

  const consulta = consultasPaciente[0] || null;

  // Evita registrar duas altas para o mesmo atendimento
  const altaExistente = db.altas.find(
    a => Number(a.pacienteId) === idPaciente
  );

  if (altaExistente) {
    return res.status(400).json({
      erro: "Este paciente já possui uma alta registrada."
    });
  }

  const alta = {
    id: Date.now(),

    pacienteId: idPaciente,

    paciente:
      paciente ||
      pacienteEncontrado.nome ||
      "Paciente não informado",

    // Dados da consulta
    diagnostico: consulta?.diagnostico || "",
    medicacao: consulta?.medicacao || "",
    observacaoConsulta: consulta?.obs || "",

    // Dados da alta
    condicao: condicao,
    orientacoes: orientacoes || "",
    recomendacoes: recomendacoes || "",
    retorno: retorno || "",
    observacoes: observacoes || "",

    dataHora: new Date().toISOString()
  };

  db.altas.push(alta);

  // Atualiza status do paciente
  pacienteEncontrado.status = "finalizado";

  // Atualiza a triagem
  const triagem = db.triagens.find(
    t =>
      Number(t.pacienteId) === idPaciente &&
      t.status === "aguardando_alta"
  );

  if (triagem) {
    triagem.status = "finalizado";
  }

  writeDB(db);

  res.status(201).json({
    mensagem: "Alta registrada com sucesso.",
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
