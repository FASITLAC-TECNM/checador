## TABLAS
| Nombre real          | Nombre ofuscado |
|----------------------|-----------------|
| offline_asistencias  | kLoPs9          |
| cache_empleados      | XyZam           |
| cache_credenciales   | qWeRt1          |
| cache_horarios       | mNoP            |
| cache_tolerancias    | aBcD3           |
| cache_roles          | ZzTop           |
| cache_usuarios_roles | uR_x2           |
| cache_departamentos  | DpT_5           |
| sync_metadata        | MeTaX           |

## COLUMNAS — offline_asistencias
| Nombre real         | Nombre ofuscado |
|---------------------|-----------------|
| local_id            | L_id1           |
| idempotency_key     | iK_99           |
| server_id           | sRv_D           |
| empleado_id         | eMp_X           |
| tipo                | tYp_3           |
| estado              | st_5            |
| dispositivo_origen  | src_D           |
| metodo_registro     | mTh_R           |
| departamento_id     | dEp_I           |
| fecha_registro      | dT_Rg           |
| payload_biometrico  | bIo_P           |
| is_synced           | iS_yn           |
| sync_attempts       | s_AtM           |
| last_sync_error     | l_ErR           |
| last_sync_attempt   | l_AtT           |
| created_at          | cR_at           |

## COLUMNAS — cache_empleados
| Nombre real   | Nombre ofuscado |
|---------------|-----------------|
| empleado_id   | eMp_K           |
| usuario_id    | uSr_I           |
| nombre        | nM_b            |
| usuario       | uS_r            |
| correo        | mAi_L           |
| estado_cuenta | sT_aC           |
| es_empleado   | iS_eM           |
| foto          | pIc_T           |
| updated_at    | uP_dt           |

## COLUMNAS — cache_credenciales
| Nombre real       | Nombre ofuscado |
|-------------------|-----------------|
| id                | cRd_D           |
| empleado_id       | eM_p2           |
| pin_hash          | pN_h            |
| dactilar_template | fP_tM           |
| facial_descriptor | fC_dS           |
| updated_at        | uP_d2           |

## COLUMNAS — cache_horarios
| Nombre real   | Nombre ofuscado |
|---------------|-----------------|
| horario_id    | hR_iD           |
| empleado_id   | eM_p3           |
| configuracion | cF_g            |
| es_activo     | iS_a2           |
| updated_at    | uP_d3           |

## COLUMNAS — cache_tolerancias
| Nombre real                 | Nombre ofuscado |
|-----------------------------|-----------------|
| id                          | tL_iD           |
| nombre                      | nM_t            |
| minutos_retardo             | m_Rt            |
| minutos_falta               | m_Ft            |
| permite_registro_anticipado | p_Ra            |
| minutos_anticipado_max      | m_Am            |
| aplica_tolerancia_entrada   | a_Te            |
| aplica_tolerancia_salida    | a_Ts            |
| dias_aplica                 | d_Ap            |
| updated_at                  | uP_d4           |

## COLUMNAS — cache_roles
| Nombre real   | Nombre ofuscado |
|---------------|-----------------|
| id            | rL_iD           |
| nombre        | nM_r            |
| tolerancia_id | tL_r2           |
| posicion      | pOs_N           |
| updated_at    | uP_d5           |

## COLUMNAS — cache_usuarios_roles
| Nombre real | Nombre ofuscado |
|-------------|-----------------|
| usuario_id  | uS_r2           |
| rol_id      | rL_i2           |
| es_activo   | iS_a3           |
| updated_at  | uP_d6           |

## COLUMNAS — cache_departamentos
| Nombre real     | Nombre ofuscado |
|-----------------|-----------------|
| empleado_id     | eM_p4           |
| departamento_id | dP_iD           |
| nombre          | nM_d            |
| es_activo       | iS_a4           |
| updated_at      | uP_d7           |

## COLUMNAS — sync_metadata
| Nombre real           | Nombre ofuscado |
|-----------------------|-----------------|
| tabla                 | tB_L            |
| last_full_sync        | l_Fs            |
| last_incremental_sync | l_Is            |
| total_records         | t_Rc            |

## VALORES ENUM
| Valor real | Valor ofuscado |
|------------|----------------|
| entrada    | IN_1           |
| salida     | OUT_0          |
| PIN        | pN_Val         |
| HUELLA     | fP_Val         |
| FACIAL     | fC_Val         |
| activo     | aC_Tv          |
| escritorio | dSk_T          |
