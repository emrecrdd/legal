import { financeV2Service } from './finance-v2.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { logger } from '../../config/logger.js';

const meta = (req) => ({ ip_address:req.realClientIp||req.ip||null, user_agent:req.headers['user-agent']||null });
const handle = (res,error,label) => { logger.error(label,error); return errorResponse(res,error.message,error.statusCode||400); };

const csvEscape = (value) => {
  if (value == null) return '';
  const text=String(value);
  return /[",;\r\n]/.test(text) ? `"${text.replace(/"/g,'""')}"` : text;
};
const ledgerToCsv = (rows) => {
  const columns=['reference_no','transaction_date','transaction_type','direction','amount','currency','account_code','account_name','status','client_id','case_id','consultation_id','description','external_reference'];
  return ['sep=;',columns.join(';'),...rows.map(row=>columns.map(c=>csvEscape(row[c])).join(';'))].join('\r\n');
};


export const financeV2Controller = {
  async listAccounts(req,res){try{return successResponse(res,await financeV2Service.listAccounts(req.user),'Finans hesapları getirildi');}catch(e){return handle(res,e,'finance-v2 list accounts');}},
  async createAccount(req,res){try{return successResponse(res,await financeV2Service.createAccount(req.body,req.user,meta(req)),'Finans hesabı oluşturuldu',201);}catch(e){return handle(res,e,'finance-v2 create account');}},
  async createFeeAgreement(req,res){try{return successResponse(res,await financeV2Service.createFeeAgreement(req.body,req.user,meta(req)),'Ücret anlaşması oluşturuldu',201);}catch(e){return handle(res,e,'finance-v2 fee agreement');}},
  async activateFeeAgreement(req,res){try{return successResponse(res,await financeV2Service.activateFeeAgreement(req.params.id,req.user,meta(req)),'Ücret anlaşması aktifleştirildi');}catch(e){return handle(res,e,'finance-v2 activate fee agreement');}},
  async completeFeeAgreement(req,res){try{return successResponse(res,await financeV2Service.completeFeeAgreement(req.params.id,req.user,meta(req)),'Ücret anlaşması tamamlandı');}catch(e){return handle(res,e,'finance-v2 complete fee agreement');}},
  async cancelFeeAgreement(req,res){try{return successResponse(res,await financeV2Service.cancelFeeAgreement(req.params.id,req.body.reason,req.user,meta(req)),'Ücret anlaşması iptal edildi');}catch(e){return handle(res,e,'finance-v2 cancel fee agreement');}},
  async createPaymentPlan(req,res){try{return successResponse(res,await financeV2Service.createPaymentPlan(req.body,req.user,meta(req)),'Ödeme planı oluşturuldu',201);}catch(e){return handle(res,e,'finance-v2 payment plan');}},
  async activatePaymentPlan(req,res){try{return successResponse(res,await financeV2Service.activatePaymentPlan(req.params.id,req.user,meta(req)),'Ödeme planı aktifleştirildi');}catch(e){return handle(res,e,'finance-v2 activate payment plan');}},
  async completePaymentPlan(req,res){try{return successResponse(res,await financeV2Service.transitionPaymentPlan(req.params.id,'complete',req.body.reason,req.user,meta(req)),'Ödeme planı tamamlandı');}catch(e){return handle(res,e,'finance-v2 complete payment plan');}},
  async defaultPaymentPlan(req,res){try{return successResponse(res,await financeV2Service.transitionPaymentPlan(req.params.id,'default',req.body.reason,req.user,meta(req)),'Ödeme planı temerrüde alındı');}catch(e){return handle(res,e,'finance-v2 default payment plan');}},
  async cancelPaymentPlan(req,res){try{return successResponse(res,await financeV2Service.transitionPaymentPlan(req.params.id,'cancel',req.body.reason,req.user,meta(req)),'Ödeme planı iptal edildi');}catch(e){return handle(res,e,'finance-v2 cancel payment plan');}},
  async createReceivable(req,res){try{return successResponse(res,await financeV2Service.createReceivable(req.body,req.user,meta(req)),'Alacak oluşturuldu',201);}catch(e){return handle(res,e,'finance-v2 receivable');}},
  async postReceivable(req,res){try{return successResponse(res,await financeV2Service.postReceivable(req.params.id,req.user,meta(req)),'Alacak tahakkuk ettirildi');}catch(e){return handle(res,e,'finance-v2 post receivable');}},
  async adjustReceivable(req,res){try{return successResponse(res,await financeV2Service.adjustReceivable(req.params.id,req.body,req.user,meta(req)),'Alacak düzeltmesi kaydedildi',201);}catch(e){return handle(res,e,'finance-v2 adjust receivable');}},
  async reverseReceivableAdjustment(req,res){try{return successResponse(res,await financeV2Service.reverseReceivableAdjustment(req.params.adjustmentId,req.body.reason,req.user,meta(req)),'Alacak düzeltmesi ters kaydedildi');}catch(e){return handle(res,e,'finance-v2 reverse receivable adjustment');}},
  async createTransaction(req,res){try{return successResponse(res,await financeV2Service.createTransaction({...req.body,idempotency_key:req.headers['idempotency-key']||req.body.idempotency_key},req.user,meta(req)),'Finans hareketi kaydedildi',201);}catch(e){return handle(res,e,'finance-v2 transaction');}},
  async reverseTransaction(req,res){try{return successResponse(res,await financeV2Service.reverseTransaction(req.params.id,req.body.reason,req.user,meta(req)),'Ters kayıt oluşturuldu');}catch(e){return handle(res,e,'finance-v2 reverse');}},
  async reverseExpense(req,res){try{return successResponse(res,await financeV2Service.reverseExpense(req.params.id,req.body.reason,req.user,meta(req)),'Masraf ters kaydedildi');}catch(e){return handle(res,e,'finance-v2 reverse expense');}},
  async reverseTransfer(req,res){try{return successResponse(res,await financeV2Service.reverseTransfer(req.params.transactionId,req.body.reason,req.user,meta(req)),'Transfer ters kaydedildi');}catch(e){return handle(res,e,'finance-v2 reverse transfer');}},
  async refundTransaction(req,res){try{return successResponse(res,await financeV2Service.createRefund(req.params.id,{...req.body,idempotency_key:req.headers['idempotency-key']||req.body.idempotency_key},req.user,meta(req)),'İade kaydedildi',201);}catch(e){return handle(res,e,'finance-v2 refund');}},
  async transfer(req,res){try{return successResponse(res,await financeV2Service.transfer(req.body,req.user,meta(req)),'Hesap transferi kaydedildi',201);}catch(e){return handle(res,e,'finance-v2 transfer');}},
  async dashboard(req,res){try{return successResponse(res,await financeV2Service.getDashboard(req.user,req.query),'Finans dashboard getirildi');}catch(e){return handle(res,e,'finance-v2 dashboard');}},
  async accountBalances(req,res){try{return successResponse(res,await financeV2Service.getAccountBalances(req.user),'Hesap bakiyeleri getirildi');}catch(e){return handle(res,e,'finance-v2 balances');}},
  async createExpense(req,res){try{return successResponse(res,await financeV2Service.createExpense(req.body,req.user,meta(req)),'Masraf kaydedildi',201);}catch(e){return handle(res,e,'finance-v2 expense');}},
  async listExpenses(req,res){try{return successResponse(res,await financeV2Service.listExpenses(req.user,req.query),'Masraflar getirildi');}catch(e){return handle(res,e,'finance-v2 list expenses');}},
  async getExpense(req,res){try{return successResponse(res,await financeV2Service.getExpense(req.params.id,req.user),'Masraf getirildi');}catch(e){return handle(res,e,'finance-v2 get expense');}},
  async listPeriods(req,res){try{return successResponse(res,await financeV2Service.listPeriods(req.user),'Finans dönemleri getirildi');}catch(e){return handle(res,e,'finance-v2 list periods');}},
  async closePeriod(req,res){try{return successResponse(res,await financeV2Service.closePeriod(req.body,req.user,meta(req)),'Finans dönemi kapatıldı');}catch(e){return handle(res,e,'finance-v2 close period');}},
  async reopenPeriod(req,res){try{return successResponse(res,await financeV2Service.reopenPeriod(req.params.periodKey,req.body.reason,req.user,meta(req)),'Finans dönemi yeniden açıldı');}catch(e){return handle(res,e,'finance-v2 reopen period');}},
  async clientSummary(req,res){try{return successResponse(res,await financeV2Service.getClientSummary(req.params.clientId,req.user),'Müvekkil finans özeti getirildi');}catch(e){return handle(res,e,'finance-v2 client summary');}},
  async caseSummary(req,res){try{return successResponse(res,await financeV2Service.getCaseSummary(req.params.caseId,req.user),'Dava finans özeti getirildi');}catch(e){return handle(res,e,'finance-v2 case summary');}},
  async consultationSummary(req,res){try{return successResponse(res,await financeV2Service.getConsultationSummary(req.params.consultationId,req.user),'Danışmanlık finans özeti getirildi');}catch(e){return handle(res,e,'finance-v2 consultation summary');}},
  async profitability(req,res){try{return successResponse(res,await financeV2Service.getProfitability(req.user,req.query),'Finans katkı raporu getirildi');}catch(e){return handle(res,e,'finance-v2 profitability');}},
  async ledger(req,res){try{return successResponse(res,await financeV2Service.getLedger(req.user,req.query),'Finans hareketleri getirildi');}catch(e){return handle(res,e,'finance-v2 ledger');}},
  async exportLedgerCsv(req,res){try{const result=await financeV2Service.getLedger(req.user,{...req.query,limit:5000,offset:0,export:true});const csv=ledgerToCsv(result.rows);res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename=derkenar-finance-ledger-${new Date().toISOString().slice(0,10)}.csv`);return res.status(200).send('\ufeff'+csv);}catch(e){return handle(res,e,'finance-v2 ledger csv');}},
  async listFeeAgreements(req,res){try{return successResponse(res,await financeV2Service.listFeeAgreements(req.user,req.query),'Ücret anlaşmaları getirildi');}catch(e){return handle(res,e,'finance-v2 list fee agreements');}},
  async getFeeAgreement(req,res){try{return successResponse(res,await financeV2Service.getFeeAgreement(req.params.id,req.user),'Ücret anlaşması getirildi');}catch(e){return handle(res,e,'finance-v2 get fee agreement');}},
  async listReceivables(req,res){try{return successResponse(res,await financeV2Service.listReceivables(req.user,req.query),'Alacaklar getirildi');}catch(e){return handle(res,e,'finance-v2 list receivables');}},
  async getReceivable(req,res){try{return successResponse(res,await financeV2Service.getReceivable(req.params.id,req.user),'Alacak getirildi');}catch(e){return handle(res,e,'finance-v2 get receivable');}},
  async listPaymentPlans(req,res){try{return successResponse(res,await financeV2Service.listPaymentPlans(req.user,req.query),'Ödeme planları getirildi');}catch(e){return handle(res,e,'finance-v2 list payment plans');}},
  async getPaymentPlan(req,res){try{return successResponse(res,await financeV2Service.getPaymentPlan(req.params.id,req.user),'Ödeme planı getirildi');}catch(e){return handle(res,e,'finance-v2 get payment plan');}},
  async getTransaction(req,res){try{return successResponse(res,await financeV2Service.getTransaction(req.params.id,req.user),'Finans hareketi getirildi');}catch(e){return handle(res,e,'finance-v2 get transaction');}},
  async auditTimeline(req,res){try{return successResponse(res,await financeV2Service.getAuditTimeline(req.params.entityType,req.params.entityId,req.user,req.query),'Finans denetim geçmişi getirildi');}catch(e){return handle(res,e,'finance-v2 audit timeline');}},
  async legacyReconciliation(req,res){try{return successResponse(res,await financeV2Service.getLegacyReconciliation(req.user),'Legacy finans mutabakat raporu getirildi');}catch(e){return handle(res,e,'finance-v2 reconciliation');}},

};
