const {response} = require('../util/response-format');
const logger = require('../util/logger');
const {getInitialTransCode, generateReceptionCode, generateInvoiceCode} = require('../util/trans-code');
const {todayMBL, todayDateNumber} = require('../util/date-utils');
const {insertRcp, insertRoomCheckin, updateIhpRoom, insertIvc, updateIhpRcpAddInvoice, getCheckinAndCheckoutTime, getRateRoomHourly, insertRcpDetailsRoom, countRoomRate} = require('../model/insert-checkin');

const postCheckinRoom = async(req, res) =>{
        try{
            
            let rcp = await generateReceptionCode();
            const member_code = `000022061122`;
            const member_name = 'ILHAM DOHAAN';
            const room_code = 'PR A';
            const room_duration = 3;
            const room_type = 'PR A';
            const pax = '8';
            const chusr = 'SELF';
            const shift = '1';
            const uang_muka = 100000;
            const QM1 = 1;
            const QM2 = 1;
            const QM3 = 1;
            const QM4 = 1;
            const QF1 = 1;
            const QF2 = 1;
            const QF3 = 1;
            const QF4 = 1;
            const keterangan = '';
            const id_payment = 1;
            const uang_voucher = 0;
            const reservation = '';
            const status_promo = 1;
            const invoice_transfer = '';
            const numberDate = await todayDateNumber();

            let isMBL = await todayMBL();
            if(todayMBL){
                isMBL = 1;
            }else{
                isMBL = 2;
            }

            const rcpData ={
            reception: rcp,
            member: member_code,
            name: member_name,
            shift:shift,
            room: room_code,
            duration: room_duration,
            QM1: QM1,
            QM2: QM2,
            QM3: QM3,
            QM4: QM4,
            QF1: QF1,
            QF2: QF2,
            QF3: QF3,
            QF4: QF4,
            PAX: pax,
            keterangan: keterangan,
            uang_muka: uang_muka,
            id_payment: id_payment,
            uang_voucher: uang_voucher,
            chusr: chusr,
            MBL: isMBL,
            reservation: reservation,
            status_promo: status_promo
            }

            const statusInsertRcp = await insertRcp(rcpData);

            if(statusInsertRcp){

                const ivc = await generateInvoiceCode();
                const ivcData = {
                    invoice: ivc,
                    shift: shift,
                    rcp: rcp,
                    member_code: member_code,
                    member_name: member_name,
                    room_code: room_code,
                    uang_muka: uang_muka,
                    invoice_transfer: invoice_transfer,
                    chusr: chusr,
                    room_type:room_type
                }

                const statusInsertIvc = await insertIvc(ivcData);
                await updateIhpRcpAddInvoice(rcp, ivc);

                if(statusInsertIvc){

                    // const statusInsertRoomCheckin = await insertRoomCheckin(room_code, rcp)
                    const statusInsertRoomCheckin = true;
                
                    if(statusInsertRoomCheckin){
                        const statusUpdateIhpRoom = await updateIhpRoom(room_code, rcp, member_name, pax, room_duration)
                        if(statusUpdateIhpRoom){
                            const timeCheckinAndCheckout = await getCheckinAndCheckoutTime(rcp);
                            const checkin = timeCheckinAndCheckout[0].checkin;
                            const checkout = timeCheckinAndCheckout[0].checkout;
                            const getRateRoomHourlyData = await getRateRoomHourly(room_type, numberDate, checkin, checkout);
                                if(timeCheckinAndCheckout != false && getRateRoomHourlyData!=false){
                                    for(let i = 0; i<getRateRoomHourlyData.length; i++){
                                    let overpax = parseFloat(getRateRoomHourlyData[i].overpax);
                                    let room_rate = parseFloat(getRateRoomHourlyData[i].tarif);
                                    await insertRcpDetailsRoom(rcp, room_type, numberDate, overpax, room_rate, getRateRoomHourlyData[i].Time_Start_Dmy, getRateRoomHourlyData[i].Time_Finish_Dmy);
                                }
                                await countRoomRate(rcp);

                                

                            }else{
                                //fail get checkin and checkoutpusextends and get rate room hourly
                                //remove ihp_rcp, ihp_ivc, ihp_roomCheckin, updateIhpRoom
                                logger.error('fail get checkin and checkoutpusextends and get rate room hourly');
                                res.send(response(false, null, 'Fail Checkin'));                                
                            }
                        }else{
                            //Fail update IHP_Room
                            //remove ihp_rcp, ihp_ivc, ihp_roomCheckin
                            logger.error('Fail update IHP_Room')
                            res.send(response(false, null, 'Fail Checkin'));                        
                        }
                    }else{
                        //fail IHP_RoomCheckin
                        //remove ihp_rcp, ihp_ivc
                        logger.error('Fail insert ihp_roomCheckin')
                        res.send(response(false, null, 'Fail Checkin'));
                    }

                }else{
                    //Fail insert ihp_ivc
                    //remove ihp_rcp
                    logger.error('Fail Insert ihp_ivc')
                    res.send(response(false, null, 'Fail Checkin'));
                }
            }else{
                //Fail Insert ihp_rcp
                logger.error('Fail Insert ihp_rcp')
                res.send(response(false, null, 'Fail Checkin'));
            }

        }catch(err){
            logger.error(`Error postCheckinRoom\n${err}`);
        }
}

postCheckinRoom()